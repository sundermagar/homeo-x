import { Router } from 'express';
import type { Request, Response, Router as ExpressRouter } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { sendSuccess } from '../../../shared/response-formatter.js';
import { DashboardRepositoryPg } from '../../repositories/dashboard.repository.pg.js';
import { DashboardUseCases } from '../../../domains/dashboard/use-cases/dashboard.use-cases.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

const getUseCases = (req: any) => {
  const repo = new DashboardRepositoryPg(req.tenantDb);
  return new DashboardUseCases(repo);
};

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const useCases = getUseCases(req);
  const period = (req.query.period as string) || 'month';
  if (!req.user) throw new Error('Unauthorized');

  const t0 = Date.now();
  const result = await useCases.getUnifiedDashboard(period, req.user.contextId, req.user as any);
  const elapsed = Date.now() - t0;
  if (elapsed > 1000) {
    console.warn(`[Dashboard] /dashboard?period=${period} took ${elapsed}ms (slow!)`);
  } else {
    console.log(`[Dashboard] /dashboard?period=${period} took ${elapsed}ms`);
  }
  if (!result.success) throw new Error(result.error);
  res.setHeader('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
  sendSuccess(res, result.data);
}));

router.get('/clinic-admin', asyncHandler(async (req, res) => {
  const useCases = getUseCases(req);
  const period = (req.query.period as string) || 'month';
  if (!req.user) throw new Error('Unauthorized');

  const t0 = Date.now();
  const result = await useCases.getClinicAdminDashboard(period, req.user.contextId);
  const elapsed = Date.now() - t0;
  if (elapsed > 1000) {
    console.warn(`[Dashboard] /clinic-admin?period=${period} took ${elapsed}ms (slow!)`);
  } else {
    console.log(`[Dashboard] /clinic-admin?period=${period} took ${elapsed}ms`);
  }
  if (!result.success) throw new Error(result.error);
  res.setHeader('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
  sendSuccess(res, result.data);
}));

router.post('/reminder/:id/done', asyncHandler(async (req, res) => {
  const useCases = getUseCases(req);
  const result = await useCases.markReminderDone(Number(req.params.id));

  if (!result.success) throw new Error(result.error);
  sendSuccess(res, result.data);
}));

export const dashboardRouter: ExpressRouter = router;
