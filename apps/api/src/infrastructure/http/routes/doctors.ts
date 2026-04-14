import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { sendSuccess } from '../../../shared/response-formatter';
import { authMiddleware } from '../middleware/auth';
import { UserRepositoryPG } from '../../repositories/user.repository.pg';

export const doctorsRouter: ExpressRouter = Router();

doctorsRouter.get('/', authMiddleware, async (req: any, res) => {
  const repo = new UserRepositoryPG(req.tenantDb);
  const doctors = await repo.findPractitioners();
  
  sendSuccess(res, doctors.map(d => ({
    id: d.id,
    name: d.name,
    specialization: 'Homoeopathy' // Defaulting for now as it's not in the base user schema
  })));
});
