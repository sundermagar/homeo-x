import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthTokenPayload } from '@mmc/types';
import { Role } from '@mmc/types';
import { createDbClient } from '@mmc/database';
import { UnauthorizedError } from '../../../shared/errors.js';
import { redisService } from '../../../infrastructure/cache/redis.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  console.time('Middleware_Auth');
  let token: string | undefined;

  try {
    // 1. Check cookies (httpOnly)
    if (req.cookies?.token) {
      token = req.cookies.token;
    }

    // 2. Fallback: Authorization header
    if (!token) {
      const header = req.headers.authorization;
      if (header?.startsWith('Bearer ')) {
        token = header.slice(7);
      }
    }

    // 3. Fallback: query parameter (supporting direct file downloads)
    if (!token && req.query.token) {
      token = req.query.token as string;
    }

    if (!token) {
      console.timeEnd('Middleware_Auth');
      return next(new UnauthorizedError('Missing authentication token'));
    }

    // ─── Token Revocation Check (JWT Blacklist) ───
    if (redisService.isConnected()) {
      const isBlacklisted = await redisService.exists(`blacklist:${token}`);
      if (isBlacklisted) {
        console.timeEnd('Middleware_Auth');
        return next(new UnauthorizedError('Token has been revoked'));
      }
    }

    // Demo bypass for local testing/prototype
    const DEMO_USERS: Record<string, Partial<AuthTokenPayload>> = {
      'demo-token-123': { id: 101, email: 'doctor@kreed.health', name: 'Dr. Demo', type: Role.Doctor, contextId: 1, roleId: 1, roleName: 'Doctor' },
      'demo-token-101': { id: 101, email: 'doctor@kreed.health', name: 'Dr. Demo', type: Role.Doctor, contextId: 1, roleId: 101, roleName: 'Doctor' },
      'demo-token-102': { id: 102, email: 'admin@kreed.health', name: 'Admin Demo', type: Role.Admin, contextId: 1, roleId: 102, roleName: 'Admin' },
      'demo-token-103': { id: 103, email: 'reception@kreed.health', name: 'Reception Demo', type: Role.Receptionist, contextId: 1, roleId: 103, roleName: 'Receptionist' },
      'demo-token-104': { id: 104, email: 'clinicadmin@kreed.health', name: 'Clinic Admin', type: Role.Clinicadmin, contextId: 1, roleId: 104, roleName: 'Clinicadmin' },
    };

    const isDev = process.env.NODE_ENV === 'development';
    if (isDev && DEMO_USERS[token]) {
      const user = DEMO_USERS[token] as AuthTokenPayload;
      req.user = user;

      req.publicDb = createDbClient(process.env.DATABASE_URL!);
      req.publicdb = req.publicDb;

      if (user.type !== Role.Admin) {
        req.tenantSlug = 'demo';
        req.tenantDb = createDbClient(process.env.DATABASE_URL!, 'tenant_demo');
        req.db = req.tenantDb;
      }

      console.timeEnd('Middleware_Auth');
      return next();
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('FATAL: JWT_SECRET is required');
    const payload = jwt.verify(token, secret) as AuthTokenPayload;
    req.user = payload;
    console.timeEnd('Middleware_Auth');
    next();
  } catch (err: any) {
    console.timeEnd('Middleware_Auth');
    next(new UnauthorizedError(err.message || 'Invalid or expired token'));
  }
}
