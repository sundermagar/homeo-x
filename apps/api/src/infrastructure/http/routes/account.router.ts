import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/async-handler';
import { validate } from '../middleware/validate';
import { createAccountSchema, updateAccountSchema } from '@mmc/validation';
import { AccountRepositoryPg } from '../../repositories/account.repository.pg';
import {
  ListAccountsUseCase,
  CreateAccountUseCase,
  UpdateAccountUseCase,
  DeleteAccountUseCase,
} from '../../../domains/platform';

export function createAccountRouter(): Router {
  const router = Router();

  // GET /api/accounts — List all accounts (optionally filtered by ?clinic_id=)
  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const rawClinicId = req.query['clinic_id'];
    const clinicId = rawClinicId ? parseInt(rawClinicId as string, 10) : undefined;
    const repo = new AccountRepositoryPg(req.publicDb);
    const result = await new ListAccountsUseCase(repo).execute(clinicId);
    res.json({ success: true, data: result });
  }));

  // GET /api/accounts/:id — Get single account (password is never returned)
  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const repo = new AccountRepositoryPg(req.publicDb);
    const account = await repo.findById(parseInt(req.params['id'] as string, 10));
    if (!account) {
      res.status(404).json({ success: false, error: 'Account not found' });
      return;
    }
    res.json({ success: true, data: account });
  }));

  // POST /api/accounts — Create account + mirror to users table
  router.post('/', validate(createAccountSchema), asyncHandler(async (req: Request, res: Response) => {
    const repo = new AccountRepositoryPg(req.publicDb);
    const result = await new CreateAccountUseCase(repo).execute(req.body);
    res.status(201).json({ success: true, message: 'Account created successfully', data: result });
  }));

  // PUT /api/accounts/:id — Update account + sync name to users table
  router.put('/:id', validate(updateAccountSchema), asyncHandler(async (req: Request, res: Response) => {
    const repo = new AccountRepositoryPg(req.publicDb);
    const id = parseInt(req.params['id'] as string, 10);
    const result = await new UpdateAccountUseCase(repo).execute(id, req.body);
    res.json({ success: true, message: 'Account updated successfully', data: result });
  }));

  // DELETE /api/accounts/:id — Soft delete from accounts + users
  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const repo = new AccountRepositoryPg(req.publicDb);
    const id = parseInt(req.params['id'] as string, 10);
    await new DeleteAccountUseCase(repo).execute(id);
    res.json({ success: true, message: 'Account deleted successfully' });
  }));

  return router;
}
