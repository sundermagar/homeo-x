import { Router } from 'express';
import type { Request, Response, Router as ExpressRouter } from 'express';
import { asyncHandler } from '../middleware/async-handler';
import { sendSuccess } from '../../../shared/response-formatter';
import { DashboardRepositoryPg } from '../../repositories/dashboard.repository.pg';
import { DashboardUseCases } from '../../../domains/dashboard/use-cases/dashboard.use-cases';
import { authMiddleware } from '../middleware/auth';

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
  
  const result = await useCases.getUnifiedDashboard(period, req.user.contextId, req.user as any);
  
  if (!result.success) throw new Error(result.error);
  sendSuccess(res, result.data);
}));

router.post('/reminder/:id/done', asyncHandler(async (req, res) => {
  const useCases = getUseCases(req);
  const result = await useCases.markReminderDone(Number(req.params.id));
  
  if (!result.success) throw new Error(result.error);
  sendSuccess(res, result.data);
}));

export const dashboardRouter: ExpressRouter = router;
