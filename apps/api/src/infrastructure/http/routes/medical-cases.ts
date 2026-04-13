import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { asyncHandler } from '../middleware/async-handler';
import { sendSuccess } from '../../../shared/response-formatter';
import { MedicalCaseRepositoryPg } from '../../repositories/medical-case.repository.pg';
import { MockMedicalCaseRepository } from '../../repositories/mocks/mock-medical-case.repository';
import { InventoryRepositoryPg } from '../../repositories/inventory.repository.pg';
import { BillingRepositoryPg } from '../../repositories/billing.repository.pg';
import { AppointmentRepositoryPG } from '../../repositories/appointment.repository.pg';
import { MockAppointmentRepository } from '../../repositories/mocks/mock-appointment.repository';
import { authMiddleware } from '../middleware/auth';
import { CreateMedicalCaseUseCase } from '../../../domains/medical-case/use-cases/create-medical-case.use-case';
import { GetFullMedicalCaseUseCase } from '../../../domains/medical-case/use-cases/get-full-medical-case.use-case';
import { FinalizeConsultationUseCase } from '../../../domains/medical-case/use-cases/finalize-consultation.use-case';
import { ManageVitalsUseCase } from '../../../domains/medical-case/use-cases/manage-vitals.use-case';
import { ManageSoapNotesUseCase } from '../../../domains/medical-case/use-cases/manage-soap-notes.use-case';
import { ManageClinicalRecordsUseCase } from '../../../domains/medical-case/use-cases/manage-clinical-records.use-case';

const router = Router();
router.use(authMiddleware);

const getRepo = (req: any) => {
  if (req.user?.id === 101 || req.user?.id === 102) {
    return new MockMedicalCaseRepository();
  }
  return new MedicalCaseRepositoryPg(req.tenantDb);
};
const getInvRepo = (req: any) => new InventoryRepositoryPg(req.tenantDb);
const getBillRepo = (req: any) => new BillingRepositoryPg(req.tenantDb);
const getApptRepo = (req: any) => {
  if (req.user?.id === 101 || req.user?.id === 102) {
    return new MockAppointmentRepository();
  }
  return new AppointmentRepositoryPG(req.tenantDb);
};

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

router.get('/soap/:visitId', asyncHandler(async (req, res) => {
  const useCase = new ManageSoapNotesUseCase(getRepo(req));
  const result = await useCase.get(Number(req.params.visitId));
  if (!result.success) throw new Error(result.error);
  sendSuccess(res, result.data);
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

router.post('/records/investigations', asyncHandler(async (req, res) => {
  const useCase = new ManageClinicalRecordsUseCase(getRepo(req));
  await useCase.saveInvestigation(req.body);
  sendSuccess(res, null, 'Investigation recorded');
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

export const medicalCasesRouter: ExpressRouter = router;
