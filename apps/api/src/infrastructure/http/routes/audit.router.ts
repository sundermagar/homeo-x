import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/async-handler';
import { AuditRepositoryPg } from '../../repositories/audit.repository.pg';
import { AuditAction } from '../../../shared/audit/audit-logger';

export function createAuditRouter(repo: AuditRepositoryPg): Router {
  const router = Router();

  // GET /api/audit — List all audit logs (SuperAdmin only)
  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const action = req.query.action as AuditAction | undefined;
    const userId = req.query.user_id ? parseInt(req.query.user_id as string, 10) : undefined;
    const tenantId = req.query.tenant_id as string | undefined;
    
    // Default limit for platform view
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const result = await repo.query({
      action,
      userId,
      tenantId,
      limit,
      offset
    });

    res.json({
      success: true,
      data: result.entries,
      total: result.total
    });
  }));

  return router;
}
