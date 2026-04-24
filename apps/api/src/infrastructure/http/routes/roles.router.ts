import { Router } from 'express';
import type { Router as IRouter } from 'express';
import type { Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { sendSuccess, sendError } from '../../../shared/response-formatter';
import { authMiddleware } from '../middleware/auth';

export const rolesRouter: IRouter = Router();

rolesRouter.use(authMiddleware as any);

/* ─────────── GET /api/roles ─────────── */
rolesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const rows = await req.tenantDb.execute(sql`
      SELECT id, name, description, created_at, updated_at, deleted_at 
      FROM roles 
      WHERE (deleted_at IS NULL OR deleted_at::text = '')
    `);

    return sendSuccess(res, rows, 'Roles retrieved');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

/* ─────────── GET /api/roles/:id ─────────── */
rolesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const rows = await req.tenantDb.execute(sql`
      SELECT id, name, description, created_at, updated_at, deleted_at 
      FROM roles 
      WHERE id = ${id} AND (deleted_at IS NULL OR deleted_at::text = '')
      LIMIT 1
    `);

    const role = (rows as any[])[0];
    if (!role) return sendError(res, 'Role not found', 404);

    const perms = await req.tenantDb.execute(sql`
      SELECT p.id, p.name 
      FROM permissions p
      INNER JOIN permission_role pr ON pr.permission_id = p.id
      WHERE pr.role_id = ${id}
    `);

    return sendSuccess(res, { ...role, permissions: perms }, 'Role retrieved');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

/* ─────────── POST /api/roles ─────────── */
rolesRouter.post('/', async (req: Request, res: Response) => {
  const { name, description } = req.body;
  if (!name?.trim()) return sendError(res, 'Role name is required', 400);

  try {
    // Manual ID generation to avoid RETURNING/sequence issues
    const maxRes = await req.tenantDb.execute(sql`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM roles`);
    const nextId = (maxRes as any[])[0]?.next_id ?? 1;

    await req.tenantDb.execute(sql`
      INSERT INTO roles (id, name, display_name, description, parent, dept, created_at, updated_at)
      VALUES (${nextId}, ${name}, ${name}, ${description || ''}, 0, 0, NOW(), NOW())
    `);

    const [created] = await req.tenantDb.execute(sql`SELECT * FROM roles WHERE id = ${nextId}`);

    // Auto-assign DASHBOARD_ACCESS + QUICK_ACCESS_VIEW to every new role
    const corePerms = await req.tenantDb.execute(sql`
      SELECT id, name FROM permissions WHERE (deleted_at IS NULL OR deleted_at::text = '')
    `);

    const dashboardPerm = (corePerms as any[]).find(p => p.name === 'DASHBOARD_ACCESS' || p.name === 'DASHBOARD_VIEW');
    const quickPerm    = (corePerms as any[]).find(p => p.name === 'QUICK_ACCESS_VIEW');
    const toAssign = [dashboardPerm, quickPerm].filter(Boolean);

    for (const p of toAssign) {
      if (p) {
        await req.tenantDb.execute(sql`
          INSERT INTO permission_role (role_id, permission_id, created_at)
          VALUES (${nextId}, ${p.id}, NOW())
          ON CONFLICT DO NOTHING
        `);
      }
    }

    return sendSuccess(res, created, 'Role created');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

/* ─────────── PUT /api/roles/:id ─────────── */
rolesRouter.put('/:id', async (req: Request, res: Response) => {
  const { name, description } = req.body;
  const id = Number(req.params.id);
  if (!name?.trim()) return sendError(res, 'Role name is required', 400);

  try {
    await req.tenantDb.execute(sql`
      UPDATE roles SET 
        name = ${name}, 
        description = ${description || ''}, 
        updated_at = NOW()
      WHERE id = ${id} AND (deleted_at IS NULL OR deleted_at::text = '')
    `);

    const [updated] = await req.tenantDb.execute(sql`SELECT * FROM roles WHERE id = ${id}`);
    if (!updated) return sendError(res, 'Role not found', 404);
    
    return sendSuccess(res, updated, 'Role updated');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

/* ─────────── DELETE /api/roles/:id ─────────── */
rolesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await req.tenantDb.execute(sql`
      UPDATE roles SET deleted_at = NOW() 
      WHERE id = ${id} AND (deleted_at IS NULL OR deleted_at::text = '')
    `);

    // Remove all permission mappings
    await req.tenantDb.execute(sql`
      DELETE FROM permission_role WHERE role_id = ${id}
    `);

    return sendSuccess(res, null, 'Role deleted');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

/* ─────────── GET /api/permissions ─────────── */
rolesRouter.get('/permissions/all', async (req: Request, res: Response) => {
  try {
    const rows = await req.tenantDb.execute(sql`
      SELECT id, name, slug, module, description 
      FROM permissions 
      WHERE (deleted_at IS NULL OR deleted_at::text = '')
      ORDER BY module ASC, name ASC
    `);

    return sendSuccess(res, rows, 'Permissions retrieved');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});
