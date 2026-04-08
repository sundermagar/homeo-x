import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../../../shared/errors';
import { createLogger } from '../../../shared/logger';

const logger = createLogger('error-handler');

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const correlationId = req.correlationId || 'unknown';
  const context = {
    correlationId,
    method: req.method,
    path: req.path,
    tenant: req.tenantSlug,
    userId: req.user?.id,
  };

  // Zod validation errors
  if (err instanceof ZodError) {
    logger.warn({ ...context, zodErrors: err.errors }, 'Validation failed');
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      correlationId,
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
    return;
  }

  // Known application errors
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ ...context, err }, err.message);
    } else {
      logger.warn({ ...context, code: err.code }, err.message);
    }
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
      correlationId,
    });
    return;
  }

  // Unknown / unhandled errors
  logger.error({ ...context, err, stack: err.stack }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR',
    correlationId,
  });
}
