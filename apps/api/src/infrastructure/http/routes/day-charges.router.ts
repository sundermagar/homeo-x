import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/async-handler';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { DayChargeRepositoryPg } from '../../repositories/accounts.repository.pg';
import {
  ListDayChargesUseCase,
  GetDayChargeUseCase,
  CreateDayChargeUseCase,
  UpdateDayChargeUseCase,
  DeleteDayChargeUseCase,
} from '../../../domains/billing';
import { createDayChargeSchema, updateDayChargeSchema } from '@mmc/validation';
import type { DbClient } from '@mmc/database';

export function createDayChargesRouter(): Router {
  const router = Router();
  router.use(authMiddleware);

  const getRepo = (req: Request) => new DayChargeRepositoryPg(req.tenantDb);

  // GET /api/day-charges
  router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      const useCase = new ListDayChargesUseCase(getRepo(req));
      const result = await useCase.execute();
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data });
    }),
  );

  // GET /api/day-charges/:id
  router.get(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }
      const useCase = new GetDayChargeUseCase(getRepo(req));
      const result = await useCase.execute(id);
      if (!result.success) {
        res.status(404).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data });
    }),
  );

  // POST /api/day-charges
  router.post(
    '/',
    validate(createDayChargeSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const useCase = new CreateDayChargeUseCase(getRepo(req));
      const result = await useCase.execute(req.body);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.status(201).json({ success: true, data: result.data });
    }),
  );

  // PUT /api/day-charges/:id
  router.put(
    '/:id',
    validate(updateDayChargeSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }
      const useCase = new UpdateDayChargeUseCase(getRepo(req));
      const result = await useCase.execute(id, req.body);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data });
    }),
  );

  // DELETE /api/day-charges/:id
  router.delete(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }
      const useCase = new DeleteDayChargeUseCase(getRepo(req));
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