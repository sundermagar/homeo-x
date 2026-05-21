import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { NotificationsRepositoryPg } from '../../repositories/notifications.repository.pg.js';
import { ok, fail } from '@mmc/types';
import { createLogger } from '../../../shared/logger.js';
import { emitNotificationToUser } from '../gateways/notifications.gateway.js';

const logger = createLogger('NotificationsRouter');

/** Login uses tenantDb → JWT user.id = tenant_demo.users.id → use tenantDb for notifications */
const getDb = (req: any) => req.tenantDb ?? req.db ?? req.publicDb;

export function createNotificationsRouter(): Router {
  const router = Router();

  // POST /api/notifications (create a notification and push via socket)
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getDb(req);
      const user = (req as any).user;
      if (!user) { res.status(401).json(fail('Unauthorized')); return; }
      if (!db)   { res.status(500).json(fail('DB not initialized')); return; }

      const { targetUserId, clinicId, type, title, message } = req.body;
      if (!targetUserId || !type || !title || !message) {
        res.status(400).json(fail('Missing required fields: targetUserId, type, title, message'));
        return;
      }

      const repo = new NotificationsRepositoryPg(db);
      const id = await repo.createNotification({ userId: targetUserId, clinicId, type, title, message });
      if (!id) { res.status(500).json(fail('Failed to create notification')); return; }

      const event = { id, userId: targetUserId, clinicId, type, title, message, isRead: false, createdAt: new Date().toISOString() };
      emitNotificationToUser(targetUserId, event);

      res.json(ok(event));
    } catch (err) { next(err); }
  });

  // GET /api/notifications
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getDb(req);
      const user = (req as any).user;
      console.log(`[Notifications] GET / user_id: ${user?.id}, db: ${db ? 'OK' : 'MISSING'}`);
      
      if (!user) { res.status(401).json(fail('Unauthorized')); return; }
      if (!db)   { res.status(500).json(fail('DB not initialized')); return; }

      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const repo = new NotificationsRepositoryPg(db);
      const result = await repo.getNotifications(user.id, limit, offset);
      console.log(`[Notifications] Found ${result.notifications.length} notifications for user ${user.id}`);

      res.json(ok({
        notifications: result.notifications,
        pagination: { total: result.total, limit, offset }
      }));
    } catch (err) { next(err); }
  });

  // GET /api/notifications/unread-count
  router.get('/unread-count', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getDb(req);
      const user = (req as any).user;
      if (!user) { res.status(401).json(fail('Unauthorized')); return; }
      if (!db)   { res.status(500).json(fail('DB not initialized')); return; }

      const repo = new NotificationsRepositoryPg(db);
      const count = await repo.getUnreadCount(user.id);

      res.json(ok({ unreadCount: count }));
    } catch (err) { next(err); }
  });

  // PUT /api/notifications/read-all
  router.put('/read-all', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getDb(req);
      const user = (req as any).user;
      if (!user) { res.status(401).json(fail('Unauthorized')); return; }
      if (!db)   { res.status(500).json(fail('DB not initialized')); return; }

      const repo = new NotificationsRepositoryPg(db);
      const success = await repo.markAllAsRead(user.id);
      res.json(ok({ success }));
    } catch (err) { next(err); }
  });

  // PUT /api/notifications/:id/read
  router.put('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getDb(req);
      const user = (req as any).user;
      if (!user) { res.status(401).json(fail('Unauthorized')); return; }
      if (!db)   { res.status(500).json(fail('DB not initialized')); return; }

      const id = parseInt(req.params.id as string);
      if (isNaN(id)) { res.status(400).json(fail('Invalid ID')); return; }

      const repo = new NotificationsRepositoryPg(db);
      const success = await repo.markAsRead(id, user.id);
      res.json(ok({ success }));
    } catch (err) { next(err); }
  });

  // DELETE /api/notifications/delete-all
  router.delete('/delete-all', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getDb(req);
      const user = (req as any).user;
      if (!user) { res.status(401).json(fail('Unauthorized')); return; }
      if (!db)   { res.status(500).json(fail('DB not initialized')); return; }

      const repo = new NotificationsRepositoryPg(db);
      const success = await repo.deleteAllNotifications(user.id);
      res.json(ok({ success }));
    } catch (err) { next(err); }
  });

  // DELETE /api/notifications/:id
  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getDb(req);
      const user = (req as any).user;
      if (!user) { res.status(401).json(fail('Unauthorized')); return; }
      if (!db)   { res.status(500).json(fail('DB not initialized')); return; }

      const id = parseInt(req.params.id as string);
      if (isNaN(id)) { res.status(400).json(fail('Invalid ID')); return; }

      const repo = new NotificationsRepositoryPg(db);
      const success = await repo.deleteNotification(id, user.id);
      res.json(ok({ success }));
    } catch (err) { next(err); }
  });

  return router;
}
