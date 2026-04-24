import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/async-handler';
import { authMiddleware } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import { ExpenseRepositoryPg } from '../../repositories/accounts.repository.pg';
import {
  ListExpensesUseCase,
  GetExpenseUseCase,
  CreateExpenseUseCase,
  UpdateExpenseUseCase,
  DeleteExpenseUseCase,
} from '../../../domains/billing';
import {
  createExpenseSchema,
  updateExpenseSchema,
  listExpensesQuerySchema,
} from '@mmc/validation';
import type { DbClient } from '@mmc/database';

export function createExpensesRouter(): Router {
  const router = Router();
  router.use(authMiddleware);

  const getRepo = (req: Request) => new ExpenseRepositoryPg(req.tenantDb);

  // GET /api/expenses
  router.get(
    '/',
    validateQuery(listExpensesQuerySchema),
    asyncHandler(async (req: Request, res: Response) => {
      const useCase = new ListExpensesUseCase(getRepo(req));
      const result = await useCase.execute(req.query as any);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data!.data, total: result.data!.total });
    }),
  );

  // GET /api/expenses/:id
  router.get(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }
      const useCase = new GetExpenseUseCase(getRepo(req));
      const result = await useCase.execute(id);
      if (!result.success) {
        res.status(404).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data });
    }),
  );

  // POST /api/expenses
  router.post(
    '/',
    validate(createExpenseSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const useCase = new CreateExpenseUseCase(getRepo(req));
      const result = await useCase.execute(req.body);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.status(201).json({ success: true, data: result.data });
    }),
  );

  // PUT /api/expenses/:id
  router.put(
    '/:id',
    validate(updateExpenseSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }
      const useCase = new UpdateExpenseUseCase(getRepo(req));
      const result = await useCase.execute(id, req.body);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result.data });
    }),
  );

  // DELETE /api/expenses/:id
  router.delete(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }
      const useCase = new DeleteExpenseUseCase(getRepo(req));
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