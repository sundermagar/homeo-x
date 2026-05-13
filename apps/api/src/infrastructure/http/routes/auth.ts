import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { LoginUseCase } from '../../../domains/auth/use-cases/login.use-case.js';
import { LogoutUseCase } from '../../../domains/auth/use-cases/logout.use-case.js';
import { ChangePasswordUseCase } from '../../../domains/auth/use-cases/change-password.use-case.js';
import { UserRepositoryPG } from '../../repositories/user.repository.pg.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { UnauthorizedError } from '../../../shared/errors.js';
import { sendSuccess } from '../../../shared/response-formatter.js';

export const authRouter: Router = Router();

/**
 * Helper to get user repository with current tenant's DB
 */
const getRepo = (req: any) => new UserRepositoryPG(req.tenantDb);

/**
 * Helper to get user repository backed by the PUBLIC schema.
 * Used as a fallback for clinic admins whose user record is mirrored
 * in the global public users table regardless of which tenant subdomain
 * the login request arrives on.
 */
const getPublicRepo = (req: any) => new UserRepositoryPG(req.publicDb);

// POST /api/auth/login
authRouter.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Primary attempt: search in the resolved tenant DB (normal staff/doctor login)
  const tenantLoginUseCase = new LoginUseCase(getRepo(req));
  let result = await tenantLoginUseCase.execute(email, password);

  // Fallback: search in the public schema (clinic admin login from any domain)
  if (!result.success) {
    console.log(`[Auth] Tenant login failed for ${email}, trying public schema fallback...`);
    const publicLoginUseCase = new LoginUseCase(getPublicRepo(req));
    result = await publicLoginUseCase.execute(email, password);
    
    if (result.success) {
      console.log(`[Auth] ✅ Public schema fallback login succeeded for ${email}`);
    }
  }

  if (result.success) {
    const { token, user } = result.data;
    
    // Set httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 60 * 1000, // 30 minutes (matches JWT expiry)
    });

    sendSuccess(res, { user });
    return;
  }

  throw new UnauthorizedError(result.error as string || 'Invalid credentials');
}));

// POST /api/auth/logout
authRouter.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
  const token = req.cookies.token;
  
  if (!token) {
    throw new UnauthorizedError('Missing token');
  }

  const logoutUseCase = new LogoutUseCase();
  await logoutUseCase.execute(token, req.user!);

  // Clear cookie
  res.clearCookie('token');
  
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
