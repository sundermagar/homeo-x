import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { asyncHandler } from '../middleware/async-handler';
import { sendSuccess } from '../../../shared/response-formatter';
import { AnalyticsRepositoryPg } from '../../repositories/analytics.repository.pg';
import { AnalyticsUseCases } from '../../../domains/analytics/use-cases/analytics.use-cases';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

const getUseCases = (req: any) => {
  const repo = new AnalyticsRepositoryPg(req.tenantDb);
  return new AnalyticsUseCases(repo);
};

router.get('/summary', asyncHandler(async (req, res) => {
  const useCases = getUseCases(req);
  const result = await useCases.getSummary();
  if (!result.success) throw new Error(result.error);
  sendSuccess(res, result.data);
}));

router.get('/patients', asyncHandler(async (req, res) => {
  const from = req.query.from ? new Date(req.query.from as string) : undefined;
  const to = req.query.to ? new Date(req.query.to as string) : undefined;
  const useCases = getUseCases(req);
  const result = await useCases.getPatientTrends(from, to);
  if (!result.success) throw new Error(result.error);
  sendSuccess(res, result.data);
}));

router.get('/casemonthwise', asyncHandler(async (req, res) => {
  const from = (req.query.from_date as string) || `${new Date().getFullYear()}-01`;
  const to = (req.query.to_date as string) || `${new Date().getFullYear()}-12`;
  const useCases = getUseCases(req);
  const result = await useCases.getMonthWiseBreakdown(from, to);
  if (!result.success) throw new Error(result.error);
  sendSuccess(res, result.data);
}));

router.get('/monthwisedue', asyncHandler(async (req, res) => {
  const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
  const useCases = getUseCases(req);
  const result = await useCases.getMonthWiseDues(year);
  if (!result.success) throw new Error(result.error);
  sendSuccess(res, result.data);
}));

router.get('/monthwisedue/details', asyncHandler(async (req, res) => {
  const year = Number(req.query.year);
  const month = req.query.month !== undefined ? Number(req.query.month) : NaN;
  if (!year || isNaN(month)) throw new Error('Year and month are required');
  const useCases = getUseCases(req);
  const result = await useCases.getDueDetails(year, month);
  if (!result.success) throw new Error(result.error);
  sendSuccess(res, result.data);
}));

router.get('/birthdaylist', asyncHandler(async (req, res) => {
  const today = new Date();
  const defaultFilter = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const from = (req.query.from_date as string) || defaultFilter;
  const to = (req.query.to_date as string) || defaultFilter;
  
  const useCases = getUseCases(req);
  const result = await useCases.getBirthdays(from, to);
  if (!result.success) throw new Error(result.error);
  sendSuccess(res, result.data);
}));

router.get('/referencelisting', asyncHandler(async (req, res) => {
  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1);
  const defaultTo = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const from = req.query.from_date ? new Date(req.query.from_date as string) : defaultFrom;
  const to = req.query.to_date ? new Date(req.query.to_date as string) : defaultTo;

  const useCases = getUseCases(req);
  const result = await useCases.getReferenceListing(from, to);
  if (!result.success) throw new Error(result.error);
  sendSuccess(res, result.data);
}));

export const analyticsRouter: ExpressRouter = router;
