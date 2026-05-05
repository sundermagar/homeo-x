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
  console.log('\n' + '='.repeat(50) + ' NEW REQUEST ' + '='.repeat(50) + '\n');
  console.time('Dashboard_Total');
  const useCases = getUseCases(req);
  const period = (req.query.period as string) || 'month';
  if (!req.user) throw new Error('Unauthorized');
  
  const result = await useCases.getUnifiedDashboard(period, req.user.contextId, req.user as any);
  if (!result.success) throw new Error(result.error);
  sendSuccess(res, result.data);
  console.timeEnd('Dashboard_Total');
}));

router.get('/clinic-admin', asyncHandler(async (req, res) => {
  console.time('ClinicAdmin_Total');
  const useCases = getUseCases(req);
  const period = (req.query.period as string) || 'month';
  if (!req.user) throw new Error('Unauthorized');

  const result = await useCases.getClinicAdminDashboard(period, req.user.contextId);
  if (!result.success) throw new Error(result.error);
  sendSuccess(res, result.data);
  console.timeEnd('ClinicAdmin_Total');
}));

router.post('/reminder/:id/done', asyncHandler(async (req, res) => {
  const useCases = getUseCases(req);
  const result = await useCases.markReminderDone(Number(req.params.id));

  if (!result.success) throw new Error(result.error);
  sendSuccess(res, result.data);
}));

export const dashboardRouter: ExpressRouter = router;
