import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { sendSuccess } from '../../../shared/response-formatter.js';
import { AnalyticsRepositoryPg } from '../../repositories/analytics.repository.pg.js';
import { AnalyticsUseCases } from '../../../domains/analytics/use-cases/analytics.use-cases.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

const getUseCases = (req: any) => {
  const repo = new AnalyticsRepositoryPg(req.tenantDb);
  return new AnalyticsUseCases(repo);
};

router.get('/summary', asyncHandler(async (req: any, res) => {
  const useCases = getUseCases(req);
  const clinicId = req.user?.contextId || req.user?.clinicId;
  const result = await useCases.getSummary(clinicId);
  if (!result.success) throw new Error(result.error);
  sendSuccess(res, result.data);
}));

router.get('/patients', asyncHandler(async (req: any, res) => {
  const from = req.query.from ? new Date(req.query.from as string) : undefined;
  const to = req.query.to ? new Date(req.query.to as string) : undefined;
  const clinicId = req.user?.contextId || req.user?.clinicId || (req.query.clinicId ? Number(req.query.clinicId) : undefined);
  if (!clinicId) throw new Error('Clinic ID is required');

  const useCases = getUseCases(req);
  const result = await useCases.getPatientTrends(clinicId, from, to);
  if (!result.success) throw new Error(result.error);
  sendSuccess(res, result.data);
}));

router.get('/casemonthwise', asyncHandler(async (req: any, res) => {
  const from = (req.query.from_date as string) || `${new Date().getFullYear()}-01`;
  const to = (req.query.to_date as string) || `${new Date().getFullYear()}-12`;
  const clinicId = req.user?.contextId || req.user?.clinicId || (req.query.clinicId ? Number(req.query.clinicId) : undefined);
  if (!clinicId) throw new Error('Clinic ID is required');

  const useCases = getUseCases(req);
  const result = await useCases.getMonthWiseBreakdown(clinicId, from, to);
  if (!result.success) throw new Error(result.error);
  sendSuccess(res, result.data);
}));

router.get('/monthwisedue', asyncHandler(async (req: any, res) => {
  const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
  const clinicId = req.user?.contextId || req.user?.clinicId || (req.query.clinicId ? Number(req.query.clinicId) : undefined);
  if (!clinicId) throw new Error('Clinic ID is required');

  const useCases = getUseCases(req);
  const result = await useCases.getMonthWiseDues(clinicId, year);
  if (!result.success) throw new Error(result.error);
  sendSuccess(res, result.data);
}));

router.get('/monthwisedue/details', asyncHandler(async (req: any, res) => {
  const year = Number(req.query.year);
  const month = req.query.month !== undefined ? Number(req.query.month) : NaN;
  if (!year || isNaN(month)) throw new Error('Year and month are required');
  const clinicId = req.user?.contextId || req.user?.clinicId || (req.query.clinicId ? Number(req.query.clinicId) : undefined);
  if (!clinicId) throw new Error('Clinic ID is required');

  const useCases = getUseCases(req);
  const result = await useCases.getDueDetails(clinicId, year, month);
  if (!result.success) throw new Error(result.error);
  sendSuccess(res, result.data);
}));

router.get('/birthdaylist', asyncHandler(async (req: any, res) => {
  const today = new Date();
  const defaultFilter = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const from = (req.query.from_date as string) || defaultFilter;
  const to = (req.query.to_date as string) || defaultFilter;
  const clinicId = req.user?.contextId || req.user?.clinicId || (req.query.clinicId ? Number(req.query.clinicId) : undefined);
  if (!clinicId) throw new Error('Clinic ID is required');
  
  const useCases = getUseCases(req);
  const result = await useCases.getBirthdays(clinicId, from, to);
  if (!result.success) throw new Error(result.error);
  sendSuccess(res, result.data);
}));

router.get('/referencelisting', asyncHandler(async (req: any, res) => {
  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1);
  const defaultTo = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const from = req.query.from_date ? new Date(req.query.from_date as string) : defaultFrom;
  const to = req.query.to_date ? new Date(req.query.to_date as string) : defaultTo;
  const clinicId = req.user?.contextId || req.user?.clinicId || (req.query.clinicId ? Number(req.query.clinicId) : undefined);
  
  console.log('[Analytics] ReferenceListing request:', { userId: req.user?.id, contextId: req.user?.contextId, clinicId });
  
  if (!clinicId) throw new Error('Clinic ID is required');

  const useCases = getUseCases(req);
  const result = await useCases.getReferenceListing(clinicId, from, to);
  if (!result.success) throw new Error(result.error);
  sendSuccess(res, result.data);
}));

export const analyticsRouter: ExpressRouter = router;
