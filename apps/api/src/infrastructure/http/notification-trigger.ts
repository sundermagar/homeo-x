// ─── Notification Trigger ────────────────────────────────────────────────
// Utility to create a DB notification AND push it via Socket.io in one call.

import type { NotificationsRepository } from '../../domains/communication/ports/notifications.repository.js';
import type { NotificationType } from '@mmc/types';
import { emitNotificationToUser } from './gateways/notifications.gateway.js';
import { createLogger } from '../../shared/logger.js';

const logger = createLogger('notification-trigger');

interface TriggerOptions {
  userId: number;
  clinicId?: number;
  type: NotificationType;
  title: string;
  message: string;
  repo: NotificationsRepository;
}

export async function triggerNotification(opts: TriggerOptions): Promise<void> {
  const { userId, clinicId, type, title, message, repo } = opts;

  try {
    const create = repo.createNotification;
    if (!create) { logger.warn('repo.createNotification not implemented'); return; }
    const id = await create({ userId, clinicId, type, title, message });
    if (id !== undefined) {
      emitNotificationToUser(userId, {
        id,
        userId,
        clinicId,
        type,
        title,
        message,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
      logger.info(`Notification ${id} created and pushed to user ${userId}`);
    }
  } catch (err: any) {
    logger.error({ err: err.message }, `Failed to trigger notification for user ${userId}`);
  }
}