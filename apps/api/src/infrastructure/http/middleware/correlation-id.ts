import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

/**
 * Injects a correlation ID into every request.
 * Uses X-Request-ID header if provided (from load balancer), otherwise generates a UUID.
 * Propagated through all logs, error responses, and audit entries.
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const id = (req.headers['x-request-id'] as string) || randomUUID();
  req.correlationId = id;
  res.setHeader('X-Request-ID', id);
  next();
}
