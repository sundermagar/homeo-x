import type { Request, Response, NextFunction } from 'express';
import { sql } from 'drizzle-orm';
import { sendError } from '../../../shared/response-formatter.js';

export function requirePermission(permissionSlug: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (!user) return sendError(res, 'Unauthorized', 401);
      
      // SuperAdmin bypass
      if (user.type === 'SuperAdmin' || user.type === 'Superadmin') {
        return next();
      }

      let roleId = user.roleId;

      // Fallback for legacy users whose role_id is null in the database
      if (!roleId && user.type) {
        const r = user.type.toLowerCase().replace(/\s/g, '');
        if (r === 'superadmin') roleId = 1;
        else if (r === 'admin' || r === 'hmis_admin' || r === 'clinicadmin') roleId = 2;
        else if (r === 'doctor' || r === 'hmis_doctor') roleId = 3;
        else if (r === 'receptionist') roleId = 4;
        else if (r === 'account' || r === 'accountmanager') roleId = 5;
      }

      if (!roleId) {
        return sendError(res, 'Access denied. No role assigned.', 403);
      }

      const rows = await req.tenantDb.execute(sql`
        SELECT p.slug 
        FROM permissions p
        INNER JOIN permission_role pr ON pr.permission_id = p.id
        WHERE pr.role_id = ${roleId} AND p.slug = ${permissionSlug}
        LIMIT 1
      `);

      const hasPerm = (rows as any[]).length > 0;
      if (!hasPerm) {
        return sendError(res, `Access denied. Requires permission: ${permissionSlug}`, 403);
      }

      next();
    } catch (err: any) {
      return sendError(res, 'RBAC check failed: ' + err.message, 500);
    }
  };
}
