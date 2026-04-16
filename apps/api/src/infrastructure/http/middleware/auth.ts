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
  const DEMO_USERS: Record<string, Partial<AuthTokenPayload>> = {
    'demo-token-123': { id: 101, email: 'doctor@homeox.com',      name: 'Dr. Demo',       type: Role.Doctor,        contextId: 1, roleId: 1,   roleName: 'Doctor' },
    'demo-token-101': { id: 101, email: 'doctor@homeox.com',      name: 'Dr. Demo',       type: Role.Doctor,        contextId: 1, roleId: 101, roleName: 'Doctor' },
    'demo-token-102': { id: 102, email: 'admin@homeox.com',       name: 'Admin Demo',     type: Role.Admin,         contextId: 1, roleId: 102, roleName: 'Admin' },
    'demo-token-103': { id: 103, email: 'reception@homeox.com',   name: 'Reception Demo', type: Role.Receptionist,  contextId: 1, roleId: 103, roleName: 'Receptionist' },
    'demo-token-104': { id: 104, email: 'clinicadmin@homeox.com', name: 'Clinic Admin',   type: Role.Clinicadmin,  contextId: 1, roleId: 104, roleName: 'Clinicadmin' },
  };
  if (DEMO_USERS[token]) {
    req.user = DEMO_USERS[token] as AuthTokenPayload;
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
