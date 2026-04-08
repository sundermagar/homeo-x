import type { Request, Response, NextFunction } from 'express';
import { createLogger } from '../../../shared/logger';

const logger = createLogger('http');

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const meta = {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      tenant: req.tenantSlug || 'unknown',
      userId: req.user?.id || null,
      ip: req.ip,
      userAgent: req.headers['user-agent']?.substring(0, 100),
    };

    if (res.statusCode >= 500) {
      logger.error(meta, `${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    } else if (res.statusCode >= 400) {
      logger.warn(meta, `${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    } else {
      logger.info(meta, `${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });

  next();
}
