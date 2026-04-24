import type { Request, Response, NextFunction } from 'express';
import { TenantRegistry, createDbClient } from '@mmc/database';
import { createLogger } from '../../../shared/logger';

const logger = createLogger('tenant');

declare global {
  namespace Express {
    interface Request {
      tenantDb: ReturnType<typeof createDbClient>;
      tenantSlug: string;
      publicDb: ReturnType<typeof createDbClient>;
      db: ReturnType<typeof createDbClient>;
      publicdb: ReturnType<typeof createDbClient>;
    }
  }
}


export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  const host = (req.headers['x-forwarded-host'] as string) || req.hostname || '';
  const tenant = TenantRegistry.resolve(host);
  
  if (req.url.includes('/login')) {
    console.log(`[TenantMiddleware] Host: ${host} -> Resolved: ${tenant?.slug || 'NONE (demo fallback)'}`);
  }

  // Always attach a public schema client (for organizations, accounts, etc.)
  req.publicDb = createDbClient(process.env.DATABASE_URL!);
  req.publicdb = req.publicDb;

  if (!tenant) {
    // Fallback to demo for development
    const fallback = TenantRegistry.resolve('demo');
    if (!fallback) {
      res.status(400).json({ success: false, error: 'Unknown tenant' });
      return;
    }
    req.tenantSlug = fallback.slug;
    req.tenantDb = createDbClient(process.env.DATABASE_URL!, fallback.schemaName);
  } else {
    req.tenantSlug = tenant.slug;
    req.tenantDb = createDbClient(process.env.DATABASE_URL!, tenant.schemaName);
  }

  req.db = req.tenantDb;
  next();
}
