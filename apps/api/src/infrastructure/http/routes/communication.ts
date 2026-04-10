import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware } from '../middleware/auth.js';
import { BadRequestError } from '../../../shared/errors.js';
import { sendSuccess } from '../../../shared/response-formatter.js';
import { ManageSmsTemplatesUseCase } from '../../../domains/communication/use-cases/manage-sms-templates.use-case.js';
import { GetSmsReportsUseCase } from '../../../domains/communication/use-cases/get-sms-reports.use-case.js';
import { SendSmsUseCase } from '../../../domains/communication/use-cases/send-sms.use-case.js';
import { SendWhatsAppUseCase } from '../../../domains/communication/use-cases/send-whatsapp.use-case.js';
import { CommunicationRepositoryPG } from '../../repositories/communication.repository.pg.js';
import { MockCommunicationRepository } from '../../repositories/mocks/mock-communication.repository.js';

export const communicationRouter: Router = Router();

const getRepo = (req: any) => {
  if ((req.user as any)?.id === 101 || (req.user as any)?.id === 102) {
    return new MockCommunicationRepository();
  }
  return new CommunicationRepositoryPG(req.tenantDb);
};

// All routes require auth
communicationRouter.use(authMiddleware);

// ─── SMS Templates ──────────────────────────────────────────────────────────────

// GET /api/communications/templates
communicationRouter.get('/templates', asyncHandler(async (req, res) => {
  const uc = new ManageSmsTemplatesUseCase(getRepo(req));
  const result = await uc.list();
  if (result.success) sendSuccess(res, result.data);
}));

// GET /api/communications/templates/:id
communicationRouter.get('/templates/:id', asyncHandler(async (req, res) => {
  const uc = new ManageSmsTemplatesUseCase(getRepo(req));
  const result = await uc.getById(Number(req.params.id));
  if (result.success) sendSuccess(res, result.data);
  else throw new BadRequestError(String(result.error));
}));

// POST /api/communications/templates
communicationRouter.post('/templates', asyncHandler(async (req, res) => {
  const uc = new ManageSmsTemplatesUseCase(getRepo(req));
  const result = await uc.create(req.body);
  if (result.success) sendSuccess(res, result.data, 'Template created', 201);
  else throw new BadRequestError(String(result.error));
}));

// PUT /api/communications/templates/:id
communicationRouter.put('/templates/:id', asyncHandler(async (req, res) => {
  const uc = new ManageSmsTemplatesUseCase(getRepo(req));
  const result = await uc.update(Number(req.params.id), req.body);
  if (result.success) sendSuccess(res, result.data, 'Template updated');
  else throw new BadRequestError(String(result.error));
}));

// DELETE /api/communications/templates/:id
communicationRouter.delete('/templates/:id', asyncHandler(async (req, res) => {
  const uc = new ManageSmsTemplatesUseCase(getRepo(req));
  const result = await uc.delete(Number(req.params.id));
  if (result.success) sendSuccess(res, undefined, 'Template deleted');
  else throw new BadRequestError(String(result.error));
}));

// ─── SMS Reports ────────────────────────────────────────────────────────────────

// GET /api/communications/reports
communicationRouter.get('/reports', asyncHandler(async (req, res) => {
  const uc = new GetSmsReportsUseCase(getRepo(req));
  const { regid, sms_type, status, from_date, to_date, phone, search, page, limit } = req.query as Record<string, string>;
  const result = await uc.execute({
    regid:     regid      ? Number(regid)      : undefined,
    smsType:   sms_type   ? sms_type           : undefined,
    status:    status     ? status             : undefined,
    fromDate:  from_date  ? from_date          : undefined,
    toDate:    to_date    ? to_date            : undefined,
    phone:     phone      ? phone              : undefined,
    search:    search     ? search             : undefined,
    page:      page       ? Number(page)       : 1,
    limit:     limit      ? Number(limit)      : 50,
  });
  if (result.success) sendSuccess(res, result.data);
}));

// ─── Send SMS ───────────────────────────────────────────────────────────────────

// POST /api/communications/sms/send — single
communicationRouter.post('/sms/send', asyncHandler(async (req, res) => {
  const uc = new SendSmsUseCase(getRepo(req));
  const { phone, message, smsType, regid } = req.body;
  const result = await uc.sendSingle({ phone, message, smsType, regid });
  if (result.success) sendSuccess(res, result.data, 'SMS sent');
  else throw new BadRequestError(String(result.error));
}));

// POST /api/communications/sms/broadcast
communicationRouter.post('/sms/broadcast', asyncHandler(async (req, res) => {
  const uc = new SendSmsUseCase(getRepo(req));
  const { patientIds, doctorId, message, smsType } = req.body;
  const result = await uc.broadcast({ patientIds, doctorId, message, smsType });
  if (result.success) sendSuccess(res, result.data, `Sent: ${result.data?.sent ?? 0}, Failed: ${result.data?.failed ?? 0}`);
  else throw new BadRequestError(String(result.error));
}));

// ─── WhatsApp ──────────────────────────────────────────────────────────────────

// POST /api/communications/whatsapp/send — single
communicationRouter.post('/whatsapp/send', asyncHandler(async (req, res) => {
  const uc = new SendWhatsAppUseCase(getRepo(req));
  const { phone, message, regid } = req.body;
  const result = await uc.sendSingle({ phone, message, regid });
  if (result.success) sendSuccess(res, result.data, 'WhatsApp link generated');
  else throw new BadRequestError(String(result.error));
}));

// POST /api/communications/whatsapp/broadcast
communicationRouter.post('/whatsapp/broadcast', asyncHandler(async (req, res) => {
  const uc = new SendWhatsAppUseCase(getRepo(req));
  const { patientIds, phone, message } = req.body;
  const result = await uc.broadcast({ patientIds, phone, message });
  if (result.success) sendSuccess(res, result.data, `WhatsApp: ${result.data?.sent ?? 0} sent`);
  else throw new BadRequestError(String(result.error));
}));

// GET /api/communications/whatsapp/logs
communicationRouter.get('/whatsapp/logs', asyncHandler(async (req, res) => {
  const repo = getRepo(req);
  const logs = await repo.listWhatsAppLogs(100);
  sendSuccess(res, logs);
}));

// ─── OTP ────────────────────────────────────────────────────────────────────────

// POST /api/communications/otp/send
communicationRouter.post('/otp/send', asyncHandler(async (req, res) => {
  const { phone } = req.body;
  if (!phone) throw new BadRequestError('phone is required');
  const repo = getRepo(req);
  const result = await repo.createOtp(phone);
  // In production, send OTP via SMS gateway and never return the code
  sendSuccess(res, { expiresAt: result.expiresAt }, 'OTP sent (check server logs in dev)');
}));

// POST /api/communications/otp/verify
communicationRouter.post('/otp/verify', asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) throw new BadRequestError('phone and otp are required');
  const repo = getRepo(req);
  const result = await repo.verifyOtp(phone, otp);
  if (result.success) sendSuccess(res, result);
  else throw new BadRequestError(result.message ?? 'Invalid OTP');
}));
