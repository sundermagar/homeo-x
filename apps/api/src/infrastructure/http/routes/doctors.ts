import { Router, type Request, type Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware } from '../middleware/auth.js';
import { SettingsRepositoryPg } from '../../repositories/settings.repository.pg.js';

export const doctorsRouter: ExpressRouter = Router();

doctorsRouter.get('/', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const repo = new SettingsRepositoryPg(req.tenantDb);
  const data = await repo.listPractitioners();
  res.json({ success: true, data });
}));
