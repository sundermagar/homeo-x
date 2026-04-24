import { Router } from 'express';
import type { Request, Response, Router as IRouter } from 'express';
import { UserRepositoryPG } from '../../repositories/user.repository.pg';
import { LoginUseCase } from '../../../domains/auth/use-cases/login.use-case';
import { sendSuccess, sendError } from '../../../shared/response-formatter';

export const authRouter: IRouter = Router();

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const userRepository = new UserRepositoryPG(req.tenantDb);
    const useCase = new LoginUseCase(userRepository);
    const result = await useCase.execute(email, password);

    if (result.success) {
      return sendSuccess(res, result.data, 'Login successful');
    }

    return sendError(res, result.error || 'Invalid credentials', 401);
  } catch (error: any) {
    return sendError(res, error.message || 'Internal Server Error', 500);
  }
});
