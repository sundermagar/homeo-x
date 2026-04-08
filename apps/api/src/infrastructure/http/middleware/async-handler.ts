import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps async Express route handlers to catch rejected promises.
 * Without this, async errors bypass Express error middleware.
 *
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | void,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
