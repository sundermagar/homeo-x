import { Router } from 'express';
import { PackageRepositoryPG } from '../../repositories/package.repository.pg';
import { ManagePackagePlansUseCase } from '../../../domains/packages/use-cases/manage-package-plans.use-case';
import { AssignPackageUseCase } from '../../../domains/packages/use-cases/assign-package.use-case';
import { GetPackageAnalyticsUseCase } from '../../../domains/packages/use-cases/get-package-analytics.use-case';
import { asyncHandler } from '../middleware/async-handler';
import { authMiddleware } from '../middleware/auth';
import { BadRequestError } from '../../../shared/errors';
import { sendSuccess } from '../../../shared/response-formatter';

export const packagesRouter: Router = Router();

packagesRouter.use(authMiddleware);

const getRepo = (req: any) => new PackageRepositoryPG(req.tenantDb);

// ─── Package Plans ────────────────────────────────────────────────────────────

// GET /api/packages — list all plans
packagesRouter.get('/', asyncHandler(async (req, res) => {
  const uc = new ManagePackagePlansUseCase(getRepo(req));
  const result = await uc.listPlans();
  if (result.success) sendSuccess(res, result.data);
}));

// GET /api/packages/analytics/expiry — expiry report
packagesRouter.get('/analytics/expiry', asyncHandler(async (req, res) => {
  const { from_date, to_date } = req.query as Record<string, string>;
  const uc = new GetPackageAnalyticsUseCase(getRepo(req));
  const result = await uc.getExpiryReport(from_date, to_date);
  if (result.success) sendSuccess(res, result.data);
}));

// GET /api/packages/analytics/stats — revenue stats
packagesRouter.get('/analytics/stats', asyncHandler(async (req, res) => {
  const uc = new GetPackageAnalyticsUseCase(getRepo(req));
  const result = await uc.getRevenueStats();
  if (result.success) sendSuccess(res, result.data);
}));

// GET /api/packages/patient/:regid — all packages for a patient
packagesRouter.get('/patient/:regid', asyncHandler(async (req, res) => {
  const uc = new AssignPackageUseCase(getRepo(req));
  const result = await uc.getPatientPackages(Number(req.params.regid));
  if (result.success) sendSuccess(res, result.data);
}));

// GET /api/packages/patient/:regid/active — active package for a patient
packagesRouter.get('/patient/:regid/active', asyncHandler(async (req, res) => {
  const uc = new AssignPackageUseCase(getRepo(req));
  const result = await uc.getActivePackage(Number(req.params.regid));
  if (result.success) sendSuccess(res, result.data);
}));

// GET /api/packages/:id — single plan
packagesRouter.get('/:id', asyncHandler(async (req, res) => {
  const uc = new ManagePackagePlansUseCase(getRepo(req));
  const result = await uc.getPlan(Number(req.params.id));
  if (result.success) sendSuccess(res, result.data);
}));

// POST /api/packages — create plan
packagesRouter.post('/', asyncHandler(async (req, res) => {
  const { name, price, durationDays } = req.body;
  if (!name || price == null || !durationDays) throw new BadRequestError('name, price, and durationDays are required');
  const uc = new ManagePackagePlansUseCase(getRepo(req));
  const result = await uc.createPlan(req.body);
  if (result.success) sendSuccess(res, result.data, 'Package plan created', 201);
}));

// PUT /api/packages/:id — update plan
packagesRouter.put('/:id', asyncHandler(async (req, res) => {
  const uc = new ManagePackagePlansUseCase(getRepo(req));
  const result = await uc.updatePlan(Number(req.params.id), req.body);
  if (result.success) sendSuccess(res, undefined, 'Package plan updated');
}));

// DELETE /api/packages/:id — soft delete plan
packagesRouter.delete('/:id', asyncHandler(async (req, res) => {
  const uc = new ManagePackagePlansUseCase(getRepo(req));
  const result = await uc.deletePlan(Number(req.params.id));
  if (result.success) sendSuccess(res, undefined, 'Package plan deleted');
}));

// ─── Assign & Subscriptions ───────────────────────────────────────────────────

// POST /api/packages/assign — assign a package to a patient
packagesRouter.post('/assign', asyncHandler(async (req, res) => {
  const { regid, packageId, patientId, startDate, notes } = req.body;
  if (!regid || !packageId || !patientId) throw new BadRequestError('regid, packageId, and patientId are required');
  const uc = new AssignPackageUseCase(getRepo(req));
  const result = await uc.execute({ regid, packageId, patientId, startDate, notes });
  if (result.success) sendSuccess(res, result.data, 'Package assigned successfully', 201);
}));

// DELETE /api/packages/subscription/:id — cancel subscription
packagesRouter.delete('/subscription/:id', asyncHandler(async (req, res) => {
  const uc = new AssignPackageUseCase(getRepo(req));
  const result = await uc.cancelSubscription(Number(req.params.id));
  if (result.success) sendSuccess(res, undefined, 'Package subscription cancelled');
}));
