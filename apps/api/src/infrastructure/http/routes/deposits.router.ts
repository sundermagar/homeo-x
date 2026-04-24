import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/async-handler';
import { authMiddleware } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import { DepositRepositoryPg } from '../../repositories/accounts.repository.pg';
import {
  ListBankDepositsUseCase,
  CreateBankDepositUseCase,
  UpdateBankDepositUseCase,
  DeleteBankDepositUseCase,
  ListCashDepositsUseCase,
  CreateCashDepositUseCase,
  UpdateCashDepositUseCase,
  DeleteCashDepositUseCase,
} from '../../../domains/billing';
import {
  createBankDepositSchema,
  updateBankDepositSchema,
  createCashDepositSchema,
  updateCashDepositSchema,
  listDepositsQuerySchema,
} from '@mmc/validation';
import type { DbClient } from '@mmc/database';

export function createDepositsRouter(): Router {
  const router = Router();
  router.use(authMiddleware);

  const getRepo = (req: Request) => new DepositRepositoryPg(req.tenantDb);

  // ─── Bank Deposits ─────────────────────────────────────────────────────────

  // GET /api/deposits/bank
  router.get(
    '/bank',
    validateQuery(listDepositsQuerySchema),
    asyncHandler(async (req: Request, res: Response) => {
      const useCase = new ListBankDepositsUseCase(getRepo(req));
      const result = await useCase.execute(req.query as any);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data!.data, total: result.data!.total });
    }),
  );

  // POST /api/deposits/bank
  router.post(
    '/bank',
    validate(createBankDepositSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const useCase = new CreateBankDepositUseCase(getRepo(req));
      const result = await useCase.execute(req.body);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.status(201).json({ success: true, data: result.data });
    }),
  );

  // PUT /api/deposits/bank/:id
  router.put(
    '/bank/:id',
    validate(updateBankDepositSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }
      const useCase = new UpdateBankDepositUseCase(getRepo(req));
      const result = await useCase.execute(id, req.body);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data });
    }),
  );

  // DELETE /api/deposits/bank/:id
  router.delete(
    '/bank/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }
      const useCase = new DeleteBankDepositUseCase(getRepo(req));
      const result = await useCase.execute(id);
      if (!result.success) {
        res.status(404).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true });
    }),
  );

  // ─── Cash Deposits ─────────────────────────────────────────────────────────

  // GET /api/deposits/cash
  router.get(
    '/cash',
    validateQuery(listDepositsQuerySchema),
    asyncHandler(async (req: Request, res: Response) => {
      const useCase = new ListCashDepositsUseCase(getRepo(req));
      const result = await useCase.execute(req.query as any);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data!.data, total: result.data!.total });
    }),
  );

  // POST /api/deposits/cash
  router.post(
    '/cash',
    validate(createCashDepositSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const useCase = new CreateCashDepositUseCase(getRepo(req));
      const result = await useCase.execute(req.body);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.status(201).json({ success: true, data: result.data });
    }),
  );

  // PUT /api/deposits/cash/:id
  router.put(
    '/cash/:id',
    validate(updateCashDepositSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }
      const useCase = new UpdateCashDepositUseCase(getRepo(req));
      const result = await useCase.execute(id, req.body);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data });
    }),
  );

  // DELETE /api/deposits/cash/:id
  router.delete(
    '/cash/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }
      const useCase = new DeleteCashDepositUseCase(getRepo(req));
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