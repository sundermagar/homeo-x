import { sql } from 'drizzle-orm';
import type { DbClient } from '@mmc/database';
import type { Notification } from '@mmc/types';
import type { NotificationsRepository } from '../../domains/communication/ports/notifications.repository.js';
import { createLogger } from '../../shared/logger.js';

const logger = createLogger('NotificationsRepository');

export class NotificationsRepositoryPg implements NotificationsRepository {
  constructor(private readonly db: DbClient) {}

  async getNotifications(userId: number, limit: number, offset: number): Promise<{ notifications: Notification[], total: number }> {
    try {
      const rows = await this.db.execute(sql`
        SELECT id, user_id, clinic_id, type, title, message, is_read, created_at
        FROM notifications
        WHERE user_id = ${userId} AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);

      const countResult = await this.db.execute(sql`
        SELECT count(*)::int as count
        FROM notifications
        WHERE user_id = ${userId} AND deleted_at IS NULL
      `);

      return {
        notifications: (rows as any[]).map(r => ({
          id: r.id,
          userId: r.user_id,
          clinicId: r.clinic_id,
          type: r.type,
          title: r.title,
          message: r.message,
          isRead: r.is_read,
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
        })),
        total: (countResult as any[])[0]?.count ?? 0,
      };
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to fetch notifications');
      return { notifications: [], total: 0 };
    }
  }

  async getUnreadCount(userId: number): Promise<number> {
    try {
      const countResult = await this.db.execute(sql`
        SELECT count(*)::int as count
        FROM notifications
        WHERE user_id = ${userId} AND is_read = false AND deleted_at IS NULL
      `);
      return (countResult as any[])[0]?.count ?? 0;
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to fetch unread count');
      return 0;
    }
  }

  async markAsRead(id: number, userId: number): Promise<boolean> {
    try {
      await this.db.execute(sql`
        UPDATE notifications
        SET is_read = true, updated_at = NOW()
        WHERE id = ${id} AND user_id = ${userId} AND deleted_at IS NULL
      `);
      return true;
    } catch (err: any) {
      logger.error({ err: err.message }, `Failed to mark notification ${id} as read`);
      return false;
    }
  }

  async markAllAsRead(userId: number): Promise<boolean> {
    try {
      await this.db.execute(sql`
        UPDATE notifications
        SET is_read = true, updated_at = NOW()
        WHERE user_id = ${userId} AND is_read = false AND deleted_at IS NULL
      `);
      return true;
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to mark all notifications as read');
      return false;
    }
  }

  async deleteNotification(id: number, userId: number): Promise<boolean> {
    try {
      await this.db.execute(sql`
        UPDATE notifications
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = ${id} AND user_id = ${userId}
      `);
      return true;
    } catch (err: any) {
      logger.error({ err: err.message }, `Failed to delete notification ${id}`);
      return false;
    }
  }

  async createNotification(data: { userId: number, clinicId?: number, type: string, title: string, message: string }): Promise<number | undefined> {
    try {
      const result = await this.db.execute(sql`
        INSERT INTO notifications (user_id, clinic_id, type, title, message)
        VALUES (${data.userId}, ${data.clinicId ?? null}, ${data.type}, ${data.title}, ${data.message})
        RETURNING id
      `);
      return (result as any[])[0]?.id;
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to create notification');
      return undefined;
    }
  }
}
