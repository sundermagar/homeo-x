import { Router } from 'express';
import type { Router as IRouter } from 'express';
import type { Request, Response } from 'express';
import { eq, and, isNull } from 'drizzle-orm';
import * as schema from '@mmc/database';
import { sendSuccess, sendError } from '../../../shared/response-formatter';
import { authMiddleware } from '../middleware/auth';

export const permissionsRouter: IRouter = Router();

permissionsRouter.use(authMiddleware as any);

/* ─────────── GET /api/permissions ─────────── */
permissionsRouter.get('/', async (req: Request, res: Response) => {
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

/* ─────────── POST /api/permissions ─────────── */
permissionsRouter.post('/', async (req: Request, res: Response) => {
  const { name, description, module } = req.body;
  if (!name?.trim()) return sendError(res, 'Permission name is required', 400);

  try {
    const slug = name.toUpperCase().replace(/\s+/g, '_');
    const [created] = await req.tenantDb
      .insert(schema.permissions)
      .values({ name, slug, module: module || 'CORE', description: description || '' })
      .returning();

    return sendSuccess(res, created, 'Permission created');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

/* ─────────── PUT /api/permissions/:id ─────────── */
permissionsRouter.put('/:id', async (req: Request, res: Response) => {
  const { name, description, module } = req.body;

  try {
    const [updated] = await req.tenantDb
      .update(schema.permissions)
      .set({ name, description: description || '', module: module || 'CORE' })
      .where(and(eq(schema.permissions.id, Number(req.params.id)), isNull(schema.permissions.deletedAt)))
      .returning();

    if (!updated) return sendError(res, 'Permission not found', 404);
    return sendSuccess(res, updated, 'Permission updated');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

/* ─────────── DELETE /api/permissions/:id ─────────── */
permissionsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await req.tenantDb
      .update(schema.permissions)
      .set({ deletedAt: new Date() })
      .where(and(eq(schema.permissions.id, Number(req.params.id)), isNull(schema.permissions.deletedAt)));

    // Remove all role mappings
    await req.tenantDb
      .delete(schema.permissionRole)
      .where(eq(schema.permissionRole.permissionId, Number(req.params.id)));

    return sendSuccess(res, null, 'Permission deleted');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

/* ─────────── POST /api/roles/:id/permissions ─────────── */
permissionsRouter.post('/roles/:id/permissions', async (req: Request, res: Response) => {
  const { permissionId } = req.body;
  if (!permissionId) return sendError(res, 'permissionId is required', 400);

  try {
    await req.tenantDb
      .insert(schema.permissionRole)
      .values({ roleId: Number(req.params.id), permissionId })
      .onConflictDoNothing();

    return sendSuccess(res, null, 'Permission assigned to role');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

/* ─────────── DELETE /api/roles/:id/permissions/:permId ─────────── */
permissionsRouter.delete('/roles/:id/permissions/:permId', async (req: Request, res: Response) => {
  try {
    await req.tenantDb
      .delete(schema.permissionRole)
      .where(
        and(
          eq(schema.permissionRole.roleId, Number(req.params.id)),
          eq(schema.permissionRole.permissionId, Number(req.params.permId)),
        ),
      );

    return sendSuccess(res, null, 'Permission revoked from role');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});
