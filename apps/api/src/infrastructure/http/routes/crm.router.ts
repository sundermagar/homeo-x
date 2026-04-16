import { Router } from 'express';
import { CrmRepositoryPg } from '../../repositories/crm.repository.pg';
import { ManageLeadsUseCase } from '../../../domains/crm/use-cases/manage-leads.use-case';
import { ManageRemindersUseCase } from '../../../domains/crm/use-cases/manage-reminders.use-case';
import { ManageReferralsUseCase } from '../../../domains/crm/use-cases/manage-referrals.use-case';
import { ConvertLeadToPatientUseCase } from '../../../domains/crm/use-cases/convert-lead-to-patient.use-case';
import { PatientRepositoryPg } from '../../repositories/patient.repository.pg';
import { asyncHandler } from '../middleware/async-handler';
import { sendSuccess } from '../../../shared/response-formatter';

export const crmRouter: Router = Router();

const getRepo = (req: any) => new CrmRepositoryPg(req.tenantDb);

// ── Leads ────────────────────────────────────────────────────────────────────

crmRouter.get('/leads', asyncHandler(async (req, res) => {
  const { search, status, page, limit } = req.query as any;
  const uc = new ManageLeadsUseCase(getRepo(req));
  const result = await uc.search({
    search, status,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20
  });
  sendSuccess(res, result.data, undefined, 200, { total: result.data.total, page: parseInt(page) || 1, limit: parseInt(limit) || 20 });
}));

crmRouter.get('/leads/:id', asyncHandler(async (req, res) => {
  const uc = new ManageLeadsUseCase(getRepo(req));
  const result = await uc.getById(Number(req.params.id));
  if (result.success) sendSuccess(res, result.data);
}));

crmRouter.post('/leads', asyncHandler(async (req, res) => {
  const uc = new ManageLeadsUseCase(getRepo(req));
  const result = await uc.create(req.body);
  if (result.success) sendSuccess(res, { id: result.data }, 'Lead created', 201);
}));

crmRouter.put('/leads/:id', asyncHandler(async (req, res) => {
  const uc = new ManageLeadsUseCase(getRepo(req));
  const result = await uc.update(Number(req.params.id), req.body);
  if (result.success) sendSuccess(res, undefined, 'Lead updated');
}));

crmRouter.delete('/leads/:id', asyncHandler(async (req, res) => {
  const uc = new ManageLeadsUseCase(getRepo(req));
  const result = await uc.delete(Number(req.params.id));
  if (result.success) sendSuccess(res, undefined, 'Lead deleted');
}));

crmRouter.post('/leads/:id/convert', asyncHandler(async (req, res) => {
  const crmRepo = getRepo(req);
  const patientRepo = new PatientRepositoryPg(req.tenantDb);
  const uc = new ConvertLeadToPatientUseCase(crmRepo, patientRepo);
  const result = await uc.execute(Number(req.params.id));
  if (result.success) sendSuccess(res, result.data, 'Lead converted to patient successfully');
}));

crmRouter.post('/leads/:id/followups', asyncHandler(async (req, res) => {
  const uc = new ManageLeadsUseCase(getRepo(req));
  const result = await uc.addFollowup(Number(req.params.id), req.body);
  if (result.success) sendSuccess(res, { id: result.data }, 'Followup added', 201);
}));

crmRouter.put('/leads/followups/:fid', asyncHandler(async (req, res) => {
  const uc = new ManageLeadsUseCase(getRepo(req));
  const result = await uc.updateFollowup(Number(req.params.fid), req.body);
  if (result.success) sendSuccess(res, undefined, 'Followup updated');
}));

crmRouter.delete('/leads/followups/:fid', asyncHandler(async (req, res) => {
  const uc = new ManageLeadsUseCase(getRepo(req));
  const result = await uc.deleteFollowup(Number(req.params.fid));
  if (result.success) sendSuccess(res, undefined, 'Followup deleted');
}));

// Legacy frontend compatibility
crmRouter.delete('/leads/:id/followups/:fid', asyncHandler(async (req, res) => {
  const uc = new ManageLeadsUseCase(getRepo(req));
  const result = await uc.deleteFollowup(Number(req.params.fid));
  if (result.success) sendSuccess(res, undefined, 'Followup deleted');
}));

// ── Referrals ────────────────────────────────────────────────────────────────

crmRouter.get('/referrals/summary', asyncHandler(async (req, res) => {
  const uc = new ManageReferralsUseCase(getRepo(req));
  const result = await uc.getSummary();
  if (result.success) sendSuccess(res, result.data);
}));

crmRouter.get('/referrals/details/:referralId', asyncHandler(async (req, res) => {
  const uc = new ManageReferralsUseCase(getRepo(req));
  const result = await uc.getDetails(Number(req.params.referralId));
  if (result.success) sendSuccess(res, result.data);
}));

crmRouter.post('/referrals', asyncHandler(async (req, res) => {
  const uc = new ManageReferralsUseCase(getRepo(req));
  const result = await uc.create(req.body);
  if (result.success) sendSuccess(res, { id: result.data }, 'Referral created', 201);
}));

crmRouter.delete('/referrals/:id', asyncHandler(async (req, res) => {
  const uc = new ManageReferralsUseCase(getRepo(req));
  const result = await uc.delete(Number(req.params.id));
  if (result.success) sendSuccess(res, undefined, 'Referral deleted');
}));

// ── Reminders ────────────────────────────────────────────────────────────────

crmRouter.get('/reminders', asyncHandler(async (req, res) => {
  const { status, page, limit, date } = req.query as any;
  const uc = new ManageRemindersUseCase(getRepo(req));
  const result = await uc.list({
    status,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    date
  });
  sendSuccess(res, result.data, undefined, 200, { total: result.data.total, page: parseInt(page) || 1, limit: parseInt(limit) || 20 });
}));

crmRouter.get('/reminders/:id', asyncHandler(async (req, res) => {
  const uc = new ManageRemindersUseCase(getRepo(req));
  const result = await uc.getById(Number(req.params.id));
  if (result.success) sendSuccess(res, result.data);
}));

crmRouter.post('/reminders', asyncHandler(async (req, res) => {
  const uc = new ManageRemindersUseCase(getRepo(req));
  const result = await uc.create(req.body);
  if (result.success) sendSuccess(res, { id: result.data }, 'Reminder created', 201);
}));

crmRouter.put('/reminders/:id', asyncHandler(async (req, res) => {
  const uc = new ManageRemindersUseCase(getRepo(req));
  const result = await uc.update(Number(req.params.id), req.body);
  if (result.success) sendSuccess(res, undefined, 'Reminder updated');
}));

crmRouter.post('/reminders/:id/done', asyncHandler(async (req, res) => {
  const uc = new ManageRemindersUseCase(getRepo(req));
  const result = await uc.markDone(Number(req.params.id));
  if (result.success) sendSuccess(res, undefined, 'Reminder marked as done');
}));

crmRouter.delete('/reminders/:id', asyncHandler(async (req, res) => {
  const uc = new ManageRemindersUseCase(getRepo(req));
  const result = await uc.delete(Number(req.params.id));
  if (result.success) sendSuccess(res, undefined, 'Reminder deleted');
}));
