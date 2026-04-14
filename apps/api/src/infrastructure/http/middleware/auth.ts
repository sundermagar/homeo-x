import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthTokenPayload } from '@mmc/types';
import { Role } from '@mmc/types';
import { UnauthorizedError } from '../../../shared/errors';

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing authentication token');
  }

    const token = header.slice(7);
    
    // Demo bypass for local testing/prototype
    if (token === 'demo-token-123') {
      req.user = { id: 101, email: 'doctor@homeox.com', name: 'Dr. Demo', type: Role.Doctor, contextId: 1, roleId: 1, roleName: 'Doctor' };
      return next();
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as AuthTokenPayload;
      req.user = payload;
      next();
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
}
