import { Router } from 'express';
import { LoginUseCase } from '../../../domains/auth/use-cases/login.use-case';
import { LogoutUseCase } from '../../../domains/auth/use-cases/logout.use-case';
import { ChangePasswordUseCase } from '../../../domains/auth/use-cases/change-password.use-case';
import { UserRepositoryPG } from '../../repositories/user.repository.pg';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/async-handler';
import { UnauthorizedError } from '../../../shared/errors';
import { sendSuccess } from '../../../shared/response-formatter';

export const authRouter: Router = Router();

/**
 * Helper to get user repository with current tenant's DB
 */
const getRepo = (req: any) => new UserRepositoryPG(req.tenantDb);

// POST /api/auth/login
authRouter.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const loginUseCase = new LoginUseCase(getRepo(req));
  
  const result = await loginUseCase.execute(email, password);
  if (result.success) {
    sendSuccess(res, result.data);
  } else {
    throw new UnauthorizedError(result.error as string || 'Invalid credentials');
  }
}));

// POST /api/auth/logout
authRouter.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  
  if (!token) {
    throw new UnauthorizedError('Missing token');
  }

  const logoutUseCase = new LogoutUseCase();
  await logoutUseCase.execute(token, req.user!);
  sendSuccess(res, undefined, 'Logged out successfully');
}));

// GET /api/auth/me
authRouter.get('/me', authMiddleware, (req, res) => {
  sendSuccess(res, { user: req.user });
});

// PUT /api/auth/password
authRouter.put('/password', authMiddleware, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const changePasswordUseCase = new ChangePasswordUseCase(getRepo(req));
  
  await changePasswordUseCase.execute(req.user!.id, currentPassword, newPassword);
  sendSuccess(res, undefined, 'Password updated successfully');
}));
