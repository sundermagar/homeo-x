import { Router } from 'express';
import { sendSuccess } from '../../../shared/response-formatter';
import { authMiddleware } from '../middleware/auth';

export const doctorsRouter = Router();

doctorsRouter.get('/', authMiddleware, (req, res) => {
  // Simple mock for practitioners
  sendSuccess(res, [
    { id: 101, name: 'Dr. Demo', specialization: 'Homoeopathy' },
    { id: 102, name: 'Dr. Specialist', specialization: 'Dermatology' },
  ]);
});
