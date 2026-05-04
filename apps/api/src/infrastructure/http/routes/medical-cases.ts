import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { asyncHandler } from '../middleware/async-handler';
import { sendSuccess } from '../../../shared/response-formatter';
import { MedicalCaseRepositoryPg } from '../../repositories/medical-case.repository.pg';
import { InventoryRepositoryPg } from '../../repositories/inventory.repository.pg';
import { BillingRepositoryPg } from '../../repositories/billing.repository.pg';
import { AppointmentRepositoryPG } from '../../repositories/appointment.repository.pg';
import { authMiddleware } from '../middleware/auth';
import { CreateMedicalCaseUseCase } from '../../../domains/medical-case/use-cases/create-medical-case.use-case';
import { GetFullMedicalCaseUseCase } from '../../../domains/medical-case/use-cases/get-full-medical-case.use-case';
import { FinalizeConsultationUseCase } from '../../../domains/medical-case/use-cases/finalize-consultation.use-case';
import { ManageVitalsUseCase } from '../../../domains/medical-case/use-cases/manage-vitals.use-case';
import { AnalyzeVitalsUseCase } from '../../../domains/medical-case/use-cases/analyze-vitals.use-case';
import { ManageSoapNotesUseCase } from '../../../domains/medical-case/use-cases/manage-soap-notes.use-case';
import { ManageClinicalRecordsUseCase } from '../../../domains/medical-case/use-cases/manage-clinical-records.use-case';
import { aiAnalysisUseCase } from '../../../domains/medical-case/use-cases/ai-analysis.use-case';
import { validate } from '../middleware/validate';
import { saveInvestigationSchema } from '@mmc/validation';

const router = Router();
router.use(authMiddleware);

import { streamToSSE } from '../../../shared/sse';

// ─── AI Clinical Consultant ───
router.post('/ai-analysis', asyncHandler(async (req, res) => {
  const params = req.body; // Validation schema skipped (Task A2 not executed)
  if (params.stream) {
    const gen = aiAnalysisUseCase.stream(params, req.tenantDb);
    await streamToSSE(req, res, gen, params.sessionId || '');
  } else {
    const result = await aiAnalysisUseCase.execute(params, req.tenantDb);
    res.locals.aiProvider = result.provider;
    sendSuccess(res, result, 'AI Analysis complete');
  }
}));

const getRepo = (req: any) => new MedicalCaseRepositoryPg(req.tenantDb);
const getInvRepo = (req: any) => new InventoryRepositoryPg(req.tenantDb);
const getBillRepo = (req: any) => new BillingRepositoryPg(req.tenantDb);
const getApptRepo = (req: any) => new AppointmentRepositoryPG(req.tenantDb);

// ─── Case Management ───

router.post('/', asyncHandler(async (req, res) => {
  const useCase = new CreateMedicalCaseUseCase(getRepo(req));
  const result = await useCase.execute(req.body);
  if (!result.success) throw new Error(result.error);
  sendSuccess(res, result.data, 'Medical case created successfully');
}));

// List & Search
router.get('/', asyncHandler(async (req, res) => {
  const { search, page, limit } = req.query;
  const repo = getRepo(req);
  const result = await repo.findMany({
    search: search as string,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });
  sendSuccess(res, result);
}));

// Aggregated Clinical Record (The 12-tab source)
router.get('/patient/:regid/full', asyncHandler(async (req, res) => {
  const useCase = new GetFullMedicalCaseUseCase(getRepo(req));
  const result = await useCase.execute(Number(req.params.regid));
  if (!result.success) throw new Error(result.error);
  sendSuccess(res, result.data);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const repo = getRepo(req);
  const result = await repo.findById(Number(req.params.id));
  sendSuccess(res, result);
}));

// ─── Vitals & SOAP ───

router.get('/vitals/:visitId', asyncHandler(async (req, res) => {
  const useCase = new ManageVitalsUseCase(getRepo(req));
  const result = await useCase.get(Number(req.params.visitId));
  if (!result.success) throw new Error(result.error);
  sendSuccess(res, result.data);
}));

router.post('/vitals', asyncHandler(async (req, res) => {
  const useCase = new ManageVitalsUseCase(getRepo(req));
  await useCase.execute(req.body);
  sendSuccess(res, null, 'Vitals recorded successfully');
}));

router.post('/vitals/analyze', asyncHandler(async (req, res) => {
  const useCase = new AnalyzeVitalsUseCase(req.tenantDb);
  const result = await useCase.execute(req.body);
  sendSuccess(res, result);
}));

router.get('/soap/:visitId', asyncHandler(async (req, res) => {
  const useCase = new ManageSoapNotesUseCase(getRepo(req));
  const result = await useCase.get(Number(req.params.visitId));
  if (!result.success) throw new Error(result.error);
  sendSuccess(res, result.data);
}));

// ─── Vaccines ───
router.get('/vaccines/master', asyncHandler(async (req, res) => {
  const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
  const result = await useCase.getMasterVaccines();
  if (!result.success) throw new Error(result.error);
  sendSuccess(res, result.data);
}));

router.get('/vaccines/:regid', asyncHandler(async (req, res) => {
  const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
  const result = await useCase.getVaccines(Number(req.params.regid));
  if (!result.success) throw new Error(result.error);
  sendSuccess(res, result.data);
}));

router.post('/vaccines', asyncHandler(async (req, res) => {
  const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
  await useCase.saveVaccine(req.body);
  sendSuccess(res, null, 'Vaccine recorded');
}));

// ─── Reminders ───
router.get('/reminders/:regid', asyncHandler(async (req, res) => {
  const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
  const result = await useCase.getReminders(Number(req.params.regid));
  if (!result.success) throw new Error(result.error);
  sendSuccess(res, result.data);
}));

router.post('/reminders', asyncHandler(async (req, res) => {
  const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
  await useCase.saveReminder(req.body);
  sendSuccess(res, null, 'Reminder saved');
}));

router.post('/soap', asyncHandler(async (req, res) => {
  const useCase = new ManageSoapNotesUseCase(getRepo(req));
  await useCase.execute(req.body);
  sendSuccess(res, null, 'SOAP notes saved successfully');
}));

// ─── Clinical Sub-Entities (Prescriptions, Notes, Labs, etc.) ───

router.post('/records/notes', asyncHandler(async (req, res) => {
  const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
  await useCase.saveNote(req.body);
  sendSuccess(res, null, 'Note saved');
}));

router.delete('/records/notes/:id', asyncHandler(async (req, res) => {
  const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
  await useCase.deleteNote(Number(req.params.id));
  sendSuccess(res, null, 'Note deleted');
}));

router.post('/records/prescriptions', asyncHandler(async (req, res) => {
  const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
  await useCase.savePrescription(req.body);
  sendSuccess(res, null, 'Prescription added');
}));

router.delete('/records/prescriptions/:id', asyncHandler(async (req, res) => {
  const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
  await useCase.deletePrescription(Number(req.params.id));
  sendSuccess(res, null, 'Prescription removed');
}));

router.post('/records/investigations', validate(saveInvestigationSchema), asyncHandler(async (req, res) => {
  const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
  await useCase.saveInvestigation(req.body);
  sendSuccess(res, null, 'Investigation recorded');
}));

router.post('/records/homeo-details', asyncHandler(async (req, res) => {
  const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
  await useCase.saveHomeoDetails(req.body);
  sendSuccess(res, null, 'Homeopathic details saved');
}));

// ─── Examination Records ───
router.get('/examination/:regid', asyncHandler(async (req, res) => {
  const repo = getRepo(req);
  const exams = await repo.getExaminations(Number(req.params.regid));
  sendSuccess(res, exams);
}));

router.post('/records/examination', asyncHandler(async (req, res) => {
  const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
  await useCase.saveExamination(req.body);
  sendSuccess(res, null, 'Examination recorded');
}));

router.delete('/records/examination/:id', asyncHandler(async (req, res) => {
  const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
  await useCase.deleteExamination(Number(req.params.id));
  sendSuccess(res, null, 'Examination deleted');
}));

// ─── Package History ───
router.get('/packages/:regid', asyncHandler(async (req, res) => {
  const repo = getRepo(req);
  const packages = await repo.getPackageHistory(Number(req.params.regid));
  sendSuccess(res, packages);
}));

// ─── Additional Charges ───
router.get('/additional-charges/:regid', asyncHandler(async (req, res) => {
  const repo = getRepo(req);
  const charges = await repo.getAdditionalCharges(Number(req.params.regid));
  sendSuccess(res, charges);
}));

router.post('/additional-charges', asyncHandler(async (req, res) => {
  const repo = getRepo(req);
  await repo.saveAdditionalCharge(req.body);
  sendSuccess(res, null, 'Additional charge saved');
}));

router.delete('/additional-charges/:id', asyncHandler(async (req, res) => {
  const repo = getRepo(req);
  await repo.deleteAdditionalCharge(Number(req.params.id));
  sendSuccess(res, null, 'Additional charge deleted');
}));

import { upload } from '../middleware/upload';

// ─── Continued route wrappers ───
router.post('/records/images', upload.array('files', 5), asyncHandler(async (req, res) => {
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
  sendSuccess(res, result.data, 'Image uploaded successfully');
}));

router.delete('/records/images/:id', asyncHandler(async (req, res) => {
  const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
  await useCase.deleteImage(Number(req.params.id));
  sendSuccess(res, null, 'Image deleted');
}));

// ─── Diagnosis Update ───

router.put('/:regid/diagnosis', asyncHandler(async (req, res) => {
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
}));

// ─── Consultation Workflow ───

router.post('/:regid/finalize', asyncHandler(async (req, res) => {
  const useCase = new FinalizeConsultationUseCase(
    getRepo(req),
    getInvRepo(req),
    getBillRepo(req),
    getApptRepo(req)
  );
  await useCase.execute({
    regid: Number(req.params.regid),
    ...req.body
  });
  sendSuccess(res, null, 'Consultation finalized successfully');
}));

import { RemedyChartUseCase } from '../../../domains/medical-case/use-cases/remedy-chart.use-case';

// ─── Remedy Chart Session ────────────────────────────────────────────────────
// Migrated from MMC legacy: remedychartAPI, addcasepotency, casepotencylisting, etc.

const getRemedyChart = (req: any) => new RemedyChartUseCase(req.tenantDb);

// GET /api/medical-cases/remedy-chart/lookups  — medicines + potencies + frequencies
router.get('/remedy-chart/lookups', asyncHandler(async (req, res) => {
  const uc = getRemedyChart(req);
  const data = await uc.getRemedyLookups();
  sendSuccess(res, data, 'Lookup tables loaded');
}));

// GET /api/medical-cases/remedy-chart/tree/alphabet  — A-Z grouped root nodes
router.get('/remedy-chart/tree/alphabet', asyncHandler(async (req, res) => {
  const uc = getRemedyChart(req);
  const data = await uc.getTreeByAlphabet();
  sendSuccess(res, data, 'Alphabet index loaded');
}));

// GET /api/medical-cases/remedy-chart/tree/filter?letter=A  — filter roots by letter
router.get('/remedy-chart/tree/filter', asyncHandler(async (req, res) => {
  const { letter } = req.query;
  const uc = getRemedyChart(req);
  const data = await uc.filterTreeByLetter(String(letter ?? 'A'));
  sendSuccess(res, data, 'Filtered tree loaded');
}));

// GET /api/medical-cases/remedy-chart/tree?label=&parentId=  — full tree (optionally filtered or lazy loaded)
router.get('/remedy-chart/tree', asyncHandler(async (req, res) => {
  const { label, parentId } = req.query as { label?: string, parentId?: string };
  const uc = getRemedyChart(req);
  const data = await uc.getRemedyTree(parentId ? parseInt(parentId) : 0, label);
  sendSuccess(res, data, 'Remedy tree loaded');
}));

// GET /api/medical-cases/remedy-chart/alternatives/:treeNodeId
router.get('/remedy-chart/alternatives/:treeNodeId', asyncHandler(async (req, res) => {
  const uc = getRemedyChart(req);
  const data = await uc.getAlternatives(Number(req.params.treeNodeId));
  sendSuccess(res, data, 'Alternatives loaded');
}));

// GET /api/medical-cases/remedy-chart/:regid  — prescription history for patient
router.get('/remedy-chart/:regid', asyncHandler(async (req, res) => {
  const uc = getRemedyChart(req);
  const data = await uc.getPrescriptionsForPatient(Number(req.params.regid));
  sendSuccess(res, data, 'Prescription history loaded');
}));

// POST /api/medical-cases/remedy-chart  — upsert prescription row
router.post('/remedy-chart', asyncHandler(async (req, res) => {
  const uc = getRemedyChart(req);
  const result = await uc.savePrescription(req.body);
  sendSuccess(res, result, 'Prescription saved successfully');
}));

// DELETE /api/medical-cases/remedy-chart/:id  — soft-delete
router.delete('/remedy-chart/:id', asyncHandler(async (req, res) => {
  const uc = getRemedyChart(req);
  await uc.deletePrescription(Number(req.params.id));
  sendSuccess(res, null, 'Prescription removed');
}));

// GET /api/medical-cases/remedy-chart/pdf/:regid
router.get('/remedy-chart/pdf/:regid', asyncHandler(async (req, res) => {
  const regid = Number(req.params.regid);
  const uc = getRemedyChart(req);
  const prescriptions = await uc.getPrescriptionsForPatient(regid);
  
  const { PdfkitServiceAdapter } = await import('../../pdf/pdfkit.service.js');
  const pdfService = new PdfkitServiceAdapter();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="prescription-${regid}.pdf"`);

  await pdfService.generatePrescription(res, {
    clinicName: (req as any).tenantDb?.schemaName || 'Homeo-X Clinic',
    patientName: `Patient ${regid}`,
    regid,
    potencies: prescriptions.map((p: any) => ({
      medicine: p.remedy_name,
      potency: p.potency_name,
      frequency: p.frequency_name,
      days: p.days,
      createdAt: p.created_at
    }))
  });
}));

// GET /api/medical-cases/pdf/summary/:regid
router.get('/pdf/summary/:regid', asyncHandler(async (req, res) => {
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
  await pdfService.generateClinicalSummary(res, {
    clinicName: (req as any).tenantDb?.schemaName || 'Homeo-X Clinic',
    patient: {
      regid: data.medicalCase.regid,
      name: data.medicalCase.patientName || 'Patient',
      age: (data.medicalCase as any).age,
      gender: (data.medicalCase as any).gender,
      phone: data.medicalCase.phone
    },
    vitals: data.vitals || [],
    homeo: data.homeo,
    notes: data.notes || [],
    prescriptions: data.prescriptions || [],
    investigations: data.investigations || []
  });
}));

export const medicalCasesRouter: ExpressRouter = router;
