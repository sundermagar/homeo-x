import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { sendSuccess } from '../../../shared/response-formatter.js';
import { authMiddleware } from '../middleware/auth.js';
import { UserRepositoryPG } from '../../repositories/user.repository.pg.js';

export const doctorsRouter: ExpressRouter = Router();

// Keep local logic: use UserRepositoryPG.findPractitioners()
doctorsRouter.get('/', authMiddleware, asyncHandler(async (req: any, res) => {
  const repo = new UserRepositoryPG(req.tenantDb);
  const doctors = await repo.findPractitioners();
  
  sendSuccess(res, doctors.map(d => ({
    id: d.id,
    name: d.name,
    specialization: 'Homoeopathy' // Defaulting for now as it's not in the base user schema
  })));
}));
