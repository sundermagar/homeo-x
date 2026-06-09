import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { createLogger } from '../../../shared/logger.js';
const logger = createLogger('medical-cases-router');
import { sendSuccess } from '../../../shared/response-formatter.js';
import { MedicalCaseRepositoryPg } from '../../repositories/medical-case.repository.pg.js';
import { InventoryRepositoryPg } from '../../repositories/inventory.repository.pg.js';
import { BillingRepositoryPg } from '../../repositories/billing.repository.pg.js';
import { AppointmentRepositoryPG } from '../../repositories/appointment.repository.pg.js';
import { NotificationsRepositoryPg } from '../../repositories/notifications.repository.pg.js';
import { authMiddleware } from '../middleware/auth.js';
import { SettingsRepositoryPg } from '../../repositories/settings.repository.pg.js';
import { OrganizationRepositoryPg } from '../../repositories/organization.repository.pg.js';
import { CourierRepositoryPg } from '../../repositories/courier.repository.pg.js';
import { CreateMedicalCaseUseCase } from '../../../domains/medical-case/use-cases/create-medical-case.use-case.js';
import { GetFullMedicalCaseUseCase } from '../../../domains/medical-case/use-cases/get-full-medical-case.use-case.js';
import { FinalizeConsultationUseCase } from '../../../domains/medical-case/use-cases/finalize-consultation.use-case.js';
import { ManageVitalsUseCase } from '../../../domains/medical-case/use-cases/manage-vitals.use-case.js';
import { AnalyzeVitalsUseCase } from '../../../domains/medical-case/use-cases/analyze-vitals.use-case.js';
import { ManageSoapNotesUseCase } from '../../../domains/medical-case/use-cases/manage-soap-notes.use-case.js';
import { ManageClinicalRecordsUseCase } from '../../../domains/medical-case/use-cases/manage-clinical-records.use-case.js';
import { aiAnalysisUseCase } from '../../../domains/medical-case/use-cases/ai-analysis.use-case.js';
import { validate } from '../middleware/validate.js';
import { saveInvestigationSchema } from '@mmc/validation';

const router = Router();
router.use(authMiddleware);

import { uploadFileToR2 } from '../../storage/r2-storage.js';

import { streamToSSE } from '../../../shared/sse.js';

// ─── AI Clinical Consultant ───
router.post(
  '/ai-analysis',
  asyncHandler(async (req, res) => {
    const params = req.body; // Validation schema skipped (Task A2 not executed)
    if (params.stream) {
      const gen = aiAnalysisUseCase.stream(params, req.tenantDb);
      await streamToSSE(req, res, gen, params.sessionId || '');
    } else {
      const result = await aiAnalysisUseCase.execute(params, req.tenantDb);
      res.locals.aiProvider = result.provider;
      sendSuccess(res, result, 'AI Analysis complete');
    }
  }),
);

router.post(
  '/ai-detect-medicine-issue',
  asyncHandler(async (req, res) => {
    const { medicine } = req.body;
    if (!medicine) {
      res.status(400).json({ success: false, error: 'Medicine name is required' });
      return;
    }

    try {
      const { getAiProviderChain } =
        await import('../../../infrastructure/ai/ai-provider-chain.js');
      const chain = getAiProviderChain();

      const response = await chain.complete({
        systemPrompt: `You are a helpful medical assistant. You are given the name of a medicine (typically an allopathic, homeopathic, or generic medicine).
Determine the primary medical condition or patient issue that this medicine is prescribed for.
Respond with ONLY the short name of the condition (e.g. 'Diabetes', 'Hypertension', 'Acid Reflux', 'Fever', 'Anxiety', etc.) in 1-4 words.
Do not write a full sentence, do not add punctuation, do not explain. Just the exact short name of the condition.`,
        userPrompt: medicine,
        temperature: 0.1,
      });

      let issue = response.content.trim();
      issue = issue.replace(/^["']|["']$/g, '').replace(/\.$/, '');

      sendSuccess(res, { issue, provider: response.provider }, 'Medicine indication detected');
    } catch (error: any) {
      sendSuccess(res, { issue: '', error: error.message }, 'AI analysis failed');
    }
  }),
);

// ─── AI Scan Investigation ───
router.post(
  '/ai-scan-investigation',
  asyncHandler(async (req, res) => {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64 || !mimeType) {
      res.status(400).json({ success: false, error: 'Image base64 and mimeType are required' });
      return;
    }

    try {
      const { getAiProviderChain } =
        await import('../../../infrastructure/ai/ai-provider-chain.js');
      const chain = getAiProviderChain();

      const response = await chain.complete({
        systemPrompt: `You are a medical data extraction assistant. You are given an image of a medical investigation report (like a lab test or radiology report).
Your task is to accurately extract:
1. The date of the investigation (in YYYY-MM-DD format). If not found, guess based on context or leave blank.
2. The category/type of the investigation. You MUST choose exactly one of the following allowed categories: "CBC", "Diabetes Profile", "Liver Profile", "Renal Profile", "Urine", "Stool", "Arthritis", "Endocrine", "X-ray - CT - MRI", "USG Female", "USG Male", "Immunology", "Lipid Profile", "Cardiac Profile", "Serology", "Semen Analysis", or "Specific". If the report type doesn't perfectly match, choose "Specific".
3. A structured JSON object containing the findings. For lab results, this should be key-value pairs of the test name and the result value (include units if possible). For radiology or textual reports, provide a "Summary" key with a beautified, concise summary of the findings.

Respond ONLY with a valid JSON object matching this schema:
{
  "date": "YYYY-MM-DD",
  "type": "Allowed Category String",
  "data": { "Test Name": "Value", ... }
}`,
        userPrompt: 'Extract the investigation details from this report image.',
        documents: [{ base64: imageBase64, mimeType }],
        temperature: 0.1,
        responseFormat: 'json',
        useCache: false,
      });

      const parsed = JSON.parse(response.content.trim());
      sendSuccess(
        res,
        { parsed, provider: response.provider },
        'Investigation scanned successfully',
      );
    } catch (error: any) {
      sendSuccess(res, { parsed: null, error: error.message }, 'AI scan failed');
    }
  }),
);

const getRepo = (req: any) => new MedicalCaseRepositoryPg(req.tenantDb);
const getInvRepo = (req: any) => new InventoryRepositoryPg(req.tenantDb);
const getBillRepo = (req: any) => new BillingRepositoryPg(req.tenantDb);
const getApptRepo = (req: any) => new AppointmentRepositoryPG(req.tenantDb);
const getSettingsRepo = (req: any) => new SettingsRepositoryPg(req.tenantDb);

// ─── Case Management ───

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const useCase = new CreateMedicalCaseUseCase(getRepo(req));
    const result = await useCase.execute(req.body);
    if (!result.success) throw new Error(result.error);
    sendSuccess(res, result.data, 'Medical case created successfully');
  }),
);
// Patient-specific records
router.get(
  '/my-records',
  asyncHandler(async (req, res) => {
    if ((req.user as any)?.type !== 'Patient') {
      res.status(403).json({ success: false, error: 'Only patients can access their own records via this endpoint' });
      return;
    }
    const regid = (req.user as any).regid;
    if (regid === undefined || regid === null) {
      // Unregistered patients have no medical records yet — return empty
      sendSuccess(res, {
        prescriptions: [],
        notes: [],
        investigations: [],
        vitals: [],
        images: [],
        vaccines: [],
        reminders: [],
        soapNotes: [],
      });
      return;
    }
    const useCase = new GetFullMedicalCaseUseCase(getRepo(req));
    const result = await useCase.execute(Number(regid));
    if (!result.success) throw new Error(result.error);
    sendSuccess(res, result.data);
  }),
);
// List & Search
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search, page, limit } = req.query;
    const repo = getRepo(req);
    const result = await repo.findMany({
      search: search as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    sendSuccess(res, result);
  }),
);

// Aggregated Clinical Record (The 12-tab source)
router.get(
  '/patient/:regid/full',
  asyncHandler(async (req, res) => {
    const useCase = new GetFullMedicalCaseUseCase(getRepo(req));
    const result = await useCase.execute(Number(req.params.regid));
    if (!result.success) throw new Error(result.error);
    sendSuccess(res, result.data);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const repo = getRepo(req);
    const result = await repo.findById(Number(req.params.id));
    sendSuccess(res, result);
  }),
);

// ─── Vitals & SOAP ───

router.get(
  '/vitals/:visitId',
  asyncHandler(async (req, res) => {
    const useCase = new ManageVitalsUseCase(getRepo(req));
    const result = await useCase.get(Number(req.params.visitId));
    if (!result.success) throw new Error(result.error);
    sendSuccess(res, result.data);
  }),
);

router.post(
  '/vitals',
  asyncHandler(async (req, res) => {
    const useCase = new ManageVitalsUseCase(getRepo(req));
    await useCase.execute(req.body);
    sendSuccess(res, null, 'Vitals recorded successfully');
  }),
);

router.delete(
  '/vitals/:id',
  asyncHandler(async (req, res) => {
    const useCase = new ManageVitalsUseCase(getRepo(req));
    await useCase.delete(Number(req.params.id));
    sendSuccess(res, null, 'Vitals record deleted');
  }),
);

router.post(
  '/vitals/analyze',
  asyncHandler(async (req, res) => {
    const useCase = new AnalyzeVitalsUseCase(req.tenantDb);
    const result = await useCase.execute(req.body);
    sendSuccess(res, result);
  }),
);

router.get(
  '/soap/:visitId',
  asyncHandler(async (req, res) => {
    const { regid } = req.query;
    const useCase = new ManageSoapNotesUseCase(getRepo(req));
    const result = await useCase.get(Number(regid), Number(req.params.visitId));
    if (!result.success) throw new Error(result.error);
    sendSuccess(res, result.data);
  }),
);

// ─── Vaccines ───
router.get(
  '/vaccines/master',
  asyncHandler(async (req, res) => {
    const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
    const result = await useCase.getMasterVaccines();
    if (!result.success) throw new Error(result.error);
    sendSuccess(res, result.data);
  }),
);

router.get(
  '/vaccines/:regid',
  asyncHandler(async (req, res) => {
    const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
    const result = await useCase.getVaccines(Number(req.params.regid));
    if (!result.success) throw new Error(result.error);
    sendSuccess(res, result.data);
  }),
);

router.post(
  '/vaccines',
  asyncHandler(async (req, res) => {
    const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
    await useCase.saveVaccine(req.body);
    sendSuccess(res, null, 'Vaccine recorded');
  }),
);

router.delete(
  '/vaccines/:id',
  asyncHandler(async (req, res) => {
    const repo = getRepo(req);
    await repo.deleteVaccine(Number(req.params.id));
    sendSuccess(res, null, 'Vaccine record deleted');
  }),
);

// ─── Reminders ───
router.get(
  '/reminders/:regid',
  asyncHandler(async (req, res) => {
    const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
    const result = await useCase.getReminders(Number(req.params.regid));
    if (!result.success) throw new Error(result.error);
    sendSuccess(res, result.data);
  }),
);

router.post(
  '/reminders',
  asyncHandler(async (req, res) => {
    const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
    await useCase.saveReminder(req.body);
    sendSuccess(res, null, 'Reminder saved');
  }),
);

router.delete(
  '/reminders/:id',
  asyncHandler(async (req, res) => {
    const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
    await useCase.deleteReminder(Number(req.params.id));
    sendSuccess(res, null, 'Reminder deleted');
  }),
);

router.post(
  '/soap',
  asyncHandler(async (req, res) => {
    const useCase = new ManageSoapNotesUseCase(getRepo(req));
    await useCase.execute(req.body);
    sendSuccess(res, null, 'SOAP notes saved successfully');
  }),
);

// ─── Clinical Sub-Entities (Prescriptions, Notes, Labs, etc.) ───

router.post(
  '/records/notes',
  asyncHandler(async (req, res) => {
    const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
    await useCase.saveNote(req.body);
    sendSuccess(res, null, 'Note saved');
  }),
);

router.delete(
  '/records/notes/:id',
  asyncHandler(async (req, res) => {
    const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
    await useCase.deleteNote(Number(req.params.id));
    sendSuccess(res, null, 'Note deleted');
  }),
);

router.post(
  '/records/prescriptions',
  asyncHandler(async (req, res) => {
    const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
    await useCase.savePrescription(req.body);
    sendSuccess(res, null, 'Prescription added');
  }),
);

router.delete(
  '/records/prescriptions/:id',
  asyncHandler(async (req, res) => {
    const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
    await useCase.deletePrescription(Number(req.params.id));
    sendSuccess(res, null, 'Prescription removed');
  }),
);

router.post(
  '/records/investigations',
  // Inject regid from JWT for Patient users BEFORE validation
  asyncHandler(async (req, _res, next) => {
    if ((req.user as any)?.type === 'Patient') {
      let regid = (req.user as any).regid;
      
      // If token is old and missing regid, fetch it from DB using patient id
      if (regid === undefined || regid === null) {
        const { patients } = await import('@mmc/database/schema');
        const { eq } = await import('drizzle-orm');
        const [patient] = await req.tenantDb!
          .select({ regid: patients.regid })
          .from(patients)
          .where(eq(patients.id, (req.user as any).id))
          .limit(1);
          
        if (patient && patient.regid) {
          regid = patient.regid;
        }
      }
      
      if (regid !== undefined && regid !== null) {
        req.body.regid = Number(regid);
      }
    }
    next();
  }),
  validate(saveInvestigationSchema),
  asyncHandler(async (req, res) => {
    if ((req.user as any)?.type === 'Patient') {
      if (!req.body.regid || isNaN(req.body.regid)) {
        res.status(400).json({ success: false, error: 'Registration ID missing from token' });
        return;
      }
    }
    const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
    await useCase.saveInvestigation(req.body);
    sendSuccess(res, null, 'Investigation recorded');
  }),
);

router.delete(
  '/records/investigations/:id',
  asyncHandler(async (req, res) => {
    const { investigations } = await import('@mmc/database/schema');
    const { eq } = await import('drizzle-orm');
    const investigationId = Number(req.params.id);

    const [inv] = await req.tenantDb!
      .select({ regid: investigations.regid })
      .from(investigations)
      .where(eq(investigations.id, investigationId))
      .limit(1);

    const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
    await useCase.deleteInvestigation(investigationId, '');

    if (inv && inv.regid) {
      const io = (req as any).io;
      if (io) {
        io.of('/notifications').to(`case:${inv.regid}`).emit('case:media-updated', {
          regid: Number(inv.regid),
          action: 'delete',
        });
        logger.info(`[NOTIF] Emitted case:media-updated (delete investigation) event to case:${inv.regid}`);
      }
    }

    sendSuccess(res, null, 'Investigation deleted');
  }),
);

router.delete(
  '/records/soap/:id',
  asyncHandler(async (req, res) => {
    const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
    await useCase.deleteSoapNote(Number(req.params.id));
    sendSuccess(res, null, 'Assessment deleted');
  }),
);

router.post(
  '/records/homeo-details',
  asyncHandler(async (req, res) => {
    const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
    await useCase.saveHomeoDetails(req.body);
    sendSuccess(res, null, 'Homeopathic details saved');
  }),
);

// ─── Examination Records ───
router.get(
  '/examination/:regid',
  asyncHandler(async (req, res) => {
    const repo = getRepo(req);
    const exams = await repo.getExaminations(Number(req.params.regid));
    sendSuccess(res, exams);
  }),
);

router.post(
  '/records/examination',
  asyncHandler(async (req, res) => {
    const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
    await useCase.saveExamination(req.body);
    sendSuccess(res, null, 'Examination recorded');
  }),
);

router.delete(
  '/records/examination/:id',
  asyncHandler(async (req, res) => {
    const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
    await useCase.deleteExamination(Number(req.params.id));
    sendSuccess(res, null, 'Examination deleted');
  }),
);

// ─── Package History ───
router.get(
  '/packages/:regid',
  asyncHandler(async (req, res) => {
    const repo = getRepo(req);
    const packages = await repo.getPackageHistory(Number(req.params.regid));
    sendSuccess(res, packages);
  }),
);

// ─── Additional Charges ───
router.get(
  '/additional-charges/:regid',
  asyncHandler(async (req, res) => {
    const repo = getRepo(req);
    const charges = await repo.getAdditionalCharges(Number(req.params.regid));
    sendSuccess(res, charges);
  }),
);

router.post(
  '/additional-charges',
  asyncHandler(async (req, res) => {
    const repo = getRepo(req);
    await repo.saveAdditionalCharge(req.body);
    sendSuccess(res, null, 'Additional charge saved');
  }),
);

router.delete(
  '/additional-charges/:id',
  asyncHandler(async (req, res) => {
    const repo = getRepo(req);
    await repo.deleteAdditionalCharge(Number(req.params.id));
    sendSuccess(res, null, 'Additional charge deleted');
  }),
);

import { upload } from '../middleware/upload.js';
import fs from 'fs';

// ─── Continued route wrappers ───
router.post(
  '/records/investigations/upload',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    const fileBuffer = await fs.promises.readFile(req.file.path);
    const base64Data = fileBuffer.toString('base64');
    const mimeType = req.file.mimetype;
    const attachmentUrl = `/uploads/${req.file.filename}`;

    try {
      const { getAiProviderChain } =
        await import('../../../infrastructure/ai/ai-provider-chain.js');
      const chain = getAiProviderChain();

      let finalPrompt = 'Extract the investigation details and summary from this report.';
      let docs: any[] = [{ base64: base64Data, mimeType }];

      if (mimeType === 'application/pdf') {
        try {
          // Import the inner lib directly. The package's index.js runs debug code
          // on import (`!module.parent`) that reads a bundled test PDF and throws
          // ENOENT under ESM, which would otherwise make every PDF fall back to
          // sending the raw binary to vision models.
          const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
          const pdfData = await pdfParse(fileBuffer);
          const extractedText = (pdfData.text || '').trim();

          // Only drop the binary when we actually got usable text. Scanned/image
          // PDFs yield little or no text, so keep the binary for the vision models.
          if (extractedText.length >= 20) {
            finalPrompt += '\n\nREPORT TEXT CONTENT:\n' + extractedText;
            // Text extracted — let fast text-only models (like Groq) handle it.
            docs = [];
          } else {
            console.warn(
              'PDF text extraction returned little/no text; falling back to vision models',
            );
          }
        } catch (err) {
          console.warn('Failed to parse PDF text locally, falling back to vision models:', err);
        }
      }

      const response = await chain.complete({
        systemPrompt: `You are a medical data extraction assistant. You are given a medical investigation report (like a lab test or radiology report).
Your task is to accurately extract:
1. The date of the investigation (in YYYY-MM-DD format). If not found, guess based on context or leave blank.
2. The category/type of the investigation. You MUST choose exactly one of the following allowed categories: "CBC", "Diabetes Profile", "Liver Profile", "Renal Profile", "Urine", "Stool", "Arthritis", "Endocrine", "X-ray - CT - MRI", "USG Female", "USG Male", "Immunology", "Lipid Profile", "Cardiac Profile", "Serology", "Semen Analysis", "USG Pelvis (TVS)", or "Specific". If the report type doesn't perfectly match, choose "Specific".
3. A structured JSON object containing the findings. For lab results, this should be key-value pairs of the test name and the result value (include units if possible).
4. Provide a "Summary" key with a beautified, concise 1-2 sentence summary of the findings (overall conclusion).

Respond ONLY with a valid JSON object matching this schema:
{
  "date": "YYYY-MM-DD",
  "type": "Allowed Category String",
  "data": { "Test Name": "Value" },
  "summary": "Short 1-2 sentence summary of the report."
}`,
        userPrompt: finalPrompt,
        documents: docs,
        temperature: 0.1,
        responseFormat: 'json',
        useCache: false,
      });

      const parsed = JSON.parse(response.content.trim());
      sendSuccess(
        res,
        { parsed, provider: response.provider, attachmentUrl },
        'Investigation scanned successfully',
      );
    } catch (error: any) {
      sendSuccess(
        res,
        { parsed: null, error: error.message, attachmentUrl },
        'AI scan failed, but file uploaded',
      );
    }
  }),
);
router.post(
  '/records/images',
  upload.array('files', 5),
  asyncHandler(async (req, res) => {
    if ((req.user as any)?.type === 'Patient') {
      let regid = (req.user as any).regid;
      
      // If token is old and missing regid, fetch it from DB using patient id
      if (regid === undefined || regid === null) {
        const { patients } = await import('@mmc/database/schema');
        const { eq } = await import('drizzle-orm');
        const [patient] = await req.tenantDb!
          .select({ regid: patients.regid })
          .from(patients)
          .where(eq(patients.id, (req.user as any).id))
          .limit(1);
          
        if (patient && patient.regid) {
          regid = patient.regid;
        }
      }
      
      if (regid !== undefined && regid !== null) {
        req.body.regid = Number(regid);
      }
    }

    if (!req.body.regid || isNaN(Number(req.body.regid))) {
      res.status(400).json({ success: false, error: 'Registration ID missing' });
      return;
    }

    const useCase = new ManageClinicalRecordsUseCase(getRepo(req));

    // Basic implementation: grab the first file's path
    const fileArray = req.files as Express.Multer.File[];
    let picturePath = req.body.picture;

    // If Multer processed files, map the local path to the DTO
    if (fileArray && fileArray.length > 0 && fileArray[0]) {
      // Relative path served by the static assets handler
      picturePath = `/uploads/${fileArray[0].filename}`;
    }

    const result = await useCase.saveImage({
      regid: Number(req.body.regid),
      description: req.body.description,
      picture: picturePath,
    });

    if (!result.success) throw new Error(result.error);

    const io = (req as any).io;
    if (io && req.body.regid) {
      io.of('/notifications').to(`case:${req.body.regid}`).emit('case:media-updated', {
        regid: Number(req.body.regid),
        action: 'upload',
      });
      logger.info(`[NOTIF] Emitted case:media-updated event to case:${req.body.regid}`);
    }

    sendSuccess(res, result.data, 'Image uploaded successfully');
  }),
);

router.delete(
  '/records/images/:id',
  asyncHandler(async (req, res) => {
    const { caseImages } = await import('@mmc/database/schema');
    const { eq } = await import('drizzle-orm');
    const imageId = Number(req.params.id);

    const [img] = await req.tenantDb!
      .select({ regid: caseImages.regid })
      .from(caseImages)
      .where(eq(caseImages.id, imageId))
      .limit(1);

    const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
    await useCase.deleteImage(imageId);

    if (img && img.regid) {
      const io = (req as any).io;
      if (io) {
        io.of('/notifications').to(`case:${img.regid}`).emit('case:media-updated', {
          regid: Number(img.regid),
          action: 'delete',
        });
        logger.info(`[NOTIF] Emitted case:media-updated (delete image) event to case:${img.regid}`);
      }
    }

    sendSuccess(res, null, 'Image deleted');
  }),
);

router.put(
  '/records/images/:id',
  asyncHandler(async (req, res) => {
    const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
    const result = await useCase.saveImage({
      id: Number(req.params.id),
      ...req.body,
    });
    if (!result.success) throw new Error(result.error);
    sendSuccess(res, result.data, 'Image updated');
  }),
);

// ─── Diagnosis Update ───

router.put(
  '/:regid/diagnosis',
  asyncHandler(async (req, res) => {
    const regid = Number(req.params.regid);
    const { condition } = req.body;
    const repo = getRepo(req);

    // Find the active medical case for this patient
    const cases = await repo.findByRegId(regid);
    const activeCase = cases.find((c: any) => c.status === 'Active') || cases[0];

    if (!activeCase) {
      res.status(404).json({ success: false, error: 'No medical case found for this patient' });
      return;
    }

    await repo.update(activeCase.id, { condition });
    sendSuccess(res, { condition }, 'Diagnosis updated successfully');
  }),
);

// ─── Consultation Workflow ───

router.post(
  '/:regid/finalize',
  asyncHandler(async (req, res) => {
    const useCase = new FinalizeConsultationUseCase(
      getRepo(req),
      getInvRepo(req),
      getBillRepo(req),
      getApptRepo(req),
      new NotificationsRepositoryPg(req.tenantDb),
    );
    await useCase.execute({
      regid: Number(req.params.regid),
      clinicId: (req as any).user?.contextId,
      ...req.body,
    });
    sendSuccess(res, null, 'Consultation finalized successfully');
  }),
);

import { RemedyChartUseCase } from '../../../domains/medical-case/use-cases/remedy-chart.use-case.js';

// ─── Remedy Chart Session ────────────────────────────────────────────────────
// Migrated from MMC legacy: remedychartAPI, addcasepotency, casepotencylisting, etc.

const getRemedyChart = (req: any) => new RemedyChartUseCase(req.tenantDb, new BillingRepositoryPg(req.tenantDb));

// GET /api/medical-cases/remedy-chart/lookups  — medicines + potencies + frequencies
router.get(
  '/remedy-chart/lookups',
  asyncHandler(async (req, res) => {
    const uc = getRemedyChart(req);
    const data = await uc.getRemedyLookups();
    sendSuccess(res, data, 'Lookup tables loaded');
  }),
);

// GET /api/medical-cases/remedy-chart/tree/alphabet  — A-Z grouped root nodes
router.get(
  '/remedy-chart/tree/alphabet',
  asyncHandler(async (req, res) => {
    const uc = getRemedyChart(req);
    const data = await uc.getTreeByAlphabet();
    sendSuccess(res, data, 'Alphabet index loaded');
  }),
);

// GET /api/medical-cases/remedy-chart/tree/filter?letter=A  — filter roots by letter
router.get(
  '/remedy-chart/tree/filter',
  asyncHandler(async (req, res) => {
    const { letter } = req.query;
    const uc = getRemedyChart(req);
    const data = await uc.filterTreeByLetter(String(letter ?? 'A'));
    sendSuccess(res, data, 'Filtered tree loaded');
  }),
);

// GET /api/medical-cases/remedy-chart/tree?label=&parentId=  — full tree (optionally filtered or lazy loaded)
router.get(
  '/remedy-chart/tree',
  asyncHandler(async (req, res) => {
    const { label, parentId } = req.query as { label?: string; parentId?: string };
    const uc = getRemedyChart(req);
    const data = await uc.getRemedyTree(parentId ? parseInt(parentId) : 0, label);
    sendSuccess(res, data, 'Remedy tree loaded');
  }),
);

// GET /api/medical-cases/remedy-chart/alternatives/:treeNodeId
router.get(
  '/remedy-chart/alternatives/:treeNodeId',
  asyncHandler(async (req, res) => {
    const uc = getRemedyChart(req);
    const data = await uc.getAlternatives(Number(req.params.treeNodeId));
    sendSuccess(res, data, 'Alternatives loaded');
  }),
);

// GET /api/medical-cases/remedy-chart/:regid  — prescription history for patient
router.get(
  '/remedy-chart/:regid',
  asyncHandler(async (req, res) => {
    const uc = getRemedyChart(req);
    const data = await uc.getPrescriptionsForPatient(Number(req.params.regid));
    sendSuccess(res, data, 'Prescription history loaded');
  }),
);

// POST /api/medical-cases/remedy-chart  — upsert prescription row
router.post(
  '/remedy-chart',
  asyncHandler(async (req, res) => {
    const uc = getRemedyChart(req);
    const result = await uc.savePrescription(req.body);
    sendSuccess(res, result, 'Prescription saved successfully');
  }),
);

// DELETE /api/medical-cases/remedy-chart/:id  — soft-delete
router.delete(
  '/remedy-chart/:id',
  asyncHandler(async (req, res) => {
    const uc = getRemedyChart(req);
    await uc.deletePrescription(Number(req.params.id));
    sendSuccess(res, null, 'Prescription removed');
  }),
);

// GET /api/medical-cases/remedy-chart/pdf/:regid
router.get(
  '/remedy-chart/pdf/:regid',
  asyncHandler(async (req, res) => {
    const regid = Number(req.params.regid);
    const uc = getRemedyChart(req);
    const repo = getRepo(req);
    const settingsRepo = getSettingsRepo(req);

    const clinicId = (req as any).user?.contextId;
    const orgRepo = new OrganizationRepositoryPg(req.publicDb);

    const [prescriptions, caseData, settings, organization] = await Promise.all([
      uc.getPrescriptionsForPatient(regid),
      repo.getCaseSummaryForPdf(regid),
      settingsRepo.listPdfSettings(),
      clinicId ? orgRepo.findById(clinicId) : Promise.resolve(null),
    ]);

    const defaultSetting = settings.find((s: any) => s.isDefault) || settings[0];
    const patient = caseData?.medicalCase;

    const { PdfkitServiceAdapter } = await import('../../pdf/pdfkit.service.js');
    const pdfService = new PdfkitServiceAdapter();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="prescription-${regid}.pdf"`);

    let filteredPrescriptions = prescriptions;
    let filteredNotes = caseData?.notes || [];

    if (req.query.date) {
      const targetDate = new Date(req.query.date as string).toDateString();
      filteredPrescriptions = prescriptions.filter((p: any) => {
        const d = new Date(p.created_at || p.createdAt || p.dateval);
        return d.toDateString() === targetDate;
      });
      filteredNotes = filteredNotes.filter((n: any) => {
        const d = new Date(n.created_at || n.createdAt || n.dateval || n.createdAt); // Try both standard casing and Drizzle casing
        // Note: For CaseNote, Drizzle uses createdAt or dateval
        return d.toDateString() === targetDate;
      });
    }

    await pdfService.generatePrescription(res, {
      clinicName:
        organization?.name ||
        defaultSetting?.templateName ||
        (req as any).tenantDb?.schemaName ||
        'Homeo-X Clinic',
      clinicAddress: organization?.address || (defaultSetting as any)?.clinicAddress || '',
      clinicPhone: organization?.phone || (defaultSetting as any)?.clinicPhone || '',
      clinicEmail: organization?.email || '',
      clinicWebsite: organization?.website || '',
      clinicLogo: organization?.logo || '',
      clinicTagline: organization?.tagLine || '',
      clinicRegistration: organization?.registration || '',
      clinicTiming: organization?.timing || '',
      patientName: patient?.patientName || `Patient ${regid}`,
      patientAge: (() => {
        let age = (patient as any)?.age;
        if (!age && patient?.dateOfBirth) {
          const dob = new Date(patient.dateOfBirth);
          if (!isNaN(dob.getTime())) {
            const ageDifMs = Date.now() - dob.getTime();
            const ageDate = new Date(ageDifMs);
            age = Math.abs(ageDate.getUTCFullYear() - 1970);
          }
        }
        return age;
      })(),
      patientGender: patient?.gender || '',
      patientPhone: patient?.phone || patient?.mobile || '',
      patientAddress: [patient?.address, patient?.city, patient?.state].filter(Boolean).join(', '),
      doctorName: patient?.doctorName || '',
      diagnosis: patient?.condition || '',
      followUpNote: filteredNotes.find((n: any) => n.notesType === 'Followup')?.notes || '',
      regid,
      potencies: filteredPrescriptions.map((p: any) => ({
        medicine: p.remedy_name || p.remedyName || p.medicineName || p.medicine || '—',
        potency: p.potency_name || p.potencyName || p.potency || '—',
        frequency: p.frequency_name || p.frequencyTitle || p.frequency || '—',
        days: p.days,
        instructions: p.instructions || p.prescription || p.notes || '—',
        createdAt: p.created_at || p.createdAt || p.dateval,
      })),
      settings: defaultSetting,
    });
  }),
);

// GET /api/medical-cases/pdf/summary/:regid
router.get(
  '/pdf/summary/:regid',
  asyncHandler(async (req, res) => {
    const regid = Number(req.params.regid);
    const useCase = new GetFullMedicalCaseUseCase(getRepo(req));
    const result = await useCase.execute(regid);

    if (!result.success) {
      res.status(404).json({ success: false, error: 'Case not found' });
      return;
    }

    const { PdfkitServiceAdapter } = await import('../../pdf/pdfkit.service.js');
    const pdfService = new PdfkitServiceAdapter();

    const filename = `clinical-summary-${regid}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const data = result.data;
    const settingsRepo = getSettingsRepo(req);
    const clinicId = (req as any).user?.contextId;
    const orgRepo = new OrganizationRepositoryPg(req.publicDb);

    const [settings, organization] = await Promise.all([
      settingsRepo.listPdfSettings(),
      clinicId ? orgRepo.findById(clinicId) : Promise.resolve(null),
    ]);

    const defaultSetting = settings.find((s: any) => s.isDefault) || settings[0];

    await pdfService.generateClinicalSummary(res, {
      clinicName:
        organization?.name ||
        defaultSetting?.templateName ||
        (req as any).tenantDb?.schemaName ||
        'Homeo-X Clinic',
      clinicAddress: organization?.address || (defaultSetting as any)?.clinicAddress || '',
      clinicPhone: organization?.phone || (defaultSetting as any)?.clinicPhone || '',
      clinicEmail: organization?.email || '',
      clinicWebsite: organization?.website || '',
      clinicLogo: organization?.logo || '',
      clinicTagline: organization?.tagLine || '',
      clinicRegistration: organization?.registration || '',
      clinicTiming: organization?.timing || '',
      patient: {
        regid: data.medicalCase.regid,
        name: data.medicalCase.patientName || 'Patient',
        age: (data.medicalCase as any).age,
        gender: (data.medicalCase as any).gender,
        phone: data.medicalCase.phone,
      },
      vitals: data.vitals || [],
      homeo: data.homeo,
      notes: data.notes || [],
      prescriptions: (data.prescriptions || []).map((p: any) => ({
        medicine: p.medicineName || p.remedyName || p.remedy_name,
        potency: p.potencyName || p.potency,
        frequency: p.frequencyTitle || p.frequency,
        days: p.days,
      })),
      investigations: data.investigations || [],
    });
  }),
);

export const medicalCasesRouter: ExpressRouter = router;
