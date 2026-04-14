import { Router } from 'express';
import type { Request, Response } from 'express';
import { eq, and, isNull } from 'drizzle-orm';
import * as schema from '@mmc/database';
import { sendSuccess, sendError } from '../../../shared/response-formatter';
import { authMiddleware } from '../middleware/auth';

export const rolesRouter = Router();

rolesRouter.use(authMiddleware as any);

/* ─────────── GET /api/roles ─────────── */
rolesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const rows = await req.tenantDb
      .select()
      .from(schema.roles)
      .where(isNull(schema.roles.deletedAt));

    return sendSuccess(res, rows, 'Roles retrieved');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

/* ─────────── GET /api/roles/:id ─────────── */
rolesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const [role] = await req.tenantDb
      .select()
      .from(schema.roles)
      .where(and(eq(schema.roles.id, Number(req.params.id)), isNull(schema.roles.deletedAt)))
      .limit(1);

    if (!role) return sendError(res, 'Role not found', 404);

    const perms = await req.tenantDb
      .select({ id: schema.permissions.id, name: schema.permissions.name })
      .from(schema.permissions)
      .innerJoin(schema.permissionRole, eq(schema.permissionRole.permissionId, schema.permissions.id))
      .where(eq(schema.permissionRole.roleId, Number(req.params.id)));

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
    const [created] = await req.tenantDb
      .insert(schema.roles)
      .values({ name, description: description || '' })
      .returning();

    // Auto-assign DASHBOARD_ACCESS + QUICK_ACCESS_VIEW to every new role
    const corePerms = await req.tenantDb
      .select({ id: schema.permissions.id })
      .from(schema.permissions)
      .where(
        and(
          isNull(schema.permissions.deletedAt),
        )
      );

    const dashboardPerm = corePerms.find(p => p.name === 'DASHBOARD_ACCESS' || p.name === 'DASHBOARD_VIEW');
    const quickPerm    = corePerms.find(p => p.name === 'QUICK_ACCESS_VIEW');
    const toAssign = [dashboardPerm, quickPerm].filter(Boolean);

    for (const p of toAssign) {
      if (p) {
        await req.tenantDb
          .insert(schema.permissionRole)
          .values({ roleId: created.id, permissionId: p.id })
          .onConflictDoNothing();
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
  if (!name?.trim()) return sendError(res, 'Role name is required', 400);

  try {
    const [updated] = await req.tenantDb
      .update(schema.roles)
      .set({ name, description: description || '' })
      .where(and(eq(schema.roles.id, Number(req.params.id)), isNull(schema.roles.deletedAt)))
      .returning();

    if (!updated) return sendError(res, 'Role not found', 404);
    return sendSuccess(res, updated, 'Role updated');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

/* ─────────── DELETE /api/roles/:id ─────────── */
rolesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await req.tenantDb
      .update(schema.roles)
      .set({ deletedAt: new Date() })
      .where(and(eq(schema.roles.id, Number(req.params.id)), isNull(schema.roles.deletedAt)));

    // Remove all permission mappings
    await req.tenantDb
      .delete(schema.permissionRole)
      .where(eq(schema.permissionRole.roleId, Number(req.params.id)));

    return sendSuccess(res, null, 'Role deleted');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

/* ─────────── GET /api/permissions ─────────── */
rolesRouter.get('/permissions/all', async (req: Request, res: Response) => {
  try {
    const rows = await req.tenantDb
      .select()
      .from(schema.permissions)
      .where(isNull(schema.permissions.deletedAt))
      .orderBy(schema.permissions.module, schema.permissions.name);

    return sendSuccess(res, rows, 'Permissions retrieved');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});
