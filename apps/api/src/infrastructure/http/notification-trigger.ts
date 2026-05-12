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
    if (!repo.createNotification) { logger.warn('repo.createNotification not implemented'); return; }
    const id = await repo.createNotification({ userId, clinicId, type, title, message });
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

interface BroadcastOptions {
  roles: string[];
  clinicId?: number;
  type: NotificationType;
  title: string;
  message: string;
  repo: NotificationsRepository;
  excludeUserIds?: number[];
}

/**
 * Fan-out a notification to every user with one of the given roles in the (optional) clinic.
 * Useful for events like INVOICE_GENERATED that should reach all Account/ClinicAdmin staff.
 */
export async function triggerNotificationToRoles(opts: BroadcastOptions): Promise<void> {
  const { roles, clinicId, type, title, message, repo, excludeUserIds = [] } = opts;
  if (!repo.findUserIdsByRole) return;
  try {
    const userIds = await repo.findUserIdsByRole(roles, clinicId);
    const targets = userIds.filter(id => !excludeUserIds.includes(id));
    await Promise.all(targets.map(userId =>
      triggerNotification({ userId, clinicId, type, title, message, repo })
    ));
  } catch (err: any) {
    logger.error({ err: err.message }, `Failed to broadcast notification to roles ${roles.join(',')}`);
  }
}