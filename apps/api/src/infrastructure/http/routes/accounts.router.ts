import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/async-handler';
import { authMiddleware } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import { AdditionalChargeRepositoryPg } from '../../repositories/accounts.repository.pg';
import {
  ListAdditionalChargesUseCase,
  GetAdditionalChargeUseCase,
  CreateAdditionalChargeUseCase,
  UpdateAdditionalChargeUseCase,
  DeleteAdditionalChargeUseCase,
} from '../../../domains/billing';
import {
  createAdditionalChargeSchema,
  updateAdditionalChargeSchema,
  listAdditionalChargesQuerySchema,
} from '@mmc/validation';
import type { DbClient } from '@mmc/database';

export function createAccountsRouter(): Router {
  const router = Router();
  router.use(authMiddleware);

  const getRepo = (req: Request) => new AdditionalChargeRepositoryPg(req.tenantDb);

  // GET /api/accounts/additional-charges
  router.get(
    '/additional-charges',
    validateQuery(listAdditionalChargesQuerySchema),
    asyncHandler(async (req: Request, res: Response) => {
      const useCase = new ListAdditionalChargesUseCase(getRepo(req));
      const result = await useCase.execute(req.query as any);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data!.data, total: result.data!.total });
    }),
  );

  // GET /api/accounts/additional-charges/:id
  router.get(
    '/additional-charges/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }
      const useCase = new GetAdditionalChargeUseCase(getRepo(req));
      const result = await useCase.execute(id);
      if (!result.success) {
        res.status(404).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data });
    }),
  );

  // POST /api/accounts/additional-charges
  router.post(
    '/additional-charges',
    validate(createAdditionalChargeSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const useCase = new CreateAdditionalChargeUseCase(getRepo(req));
      const result = await useCase.execute(req.body);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.status(201).json({ success: true, data: result.data });
    }),
  );

  // PUT /api/accounts/additional-charges/:id
  router.put(
    '/additional-charges/:id',
    validate(updateAdditionalChargeSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }
      const useCase = new UpdateAdditionalChargeUseCase(getRepo(req));
      const result = await useCase.execute(id, req.body);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data });
    }),
  );

  // DELETE /api/accounts/additional-charges/:id
  router.delete(
    '/additional-charges/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }
      const useCase = new DeleteAdditionalChargeUseCase(getRepo(req));
      const result = await useCase.execute(id);
      if (!result.success) {
        res.status(404).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true });
    }),
  );

  return router;
}