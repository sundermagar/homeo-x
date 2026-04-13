import { Router } from 'express';
import type { Request, Response, Router as IRouter } from 'express';

export const authRouter: IRouter = Router();

// POST /api/auth/login
authRouter.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Simple mock authentication for development
  if (email && password) {
    return res.json({
      success: true,
      token: 'mock-jwt-token-for-dev',
      user: {
        id: '1',
        email: email,
        name: 'Dr. Sunder Magar',
        role: 'ADMIN',
        clinicId: 1
      }
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid credentials'
  });
});
