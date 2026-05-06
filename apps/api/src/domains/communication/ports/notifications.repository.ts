import type { Notification } from '@mmc/types';

export interface NotificationsRepository {
  getNotifications(userId: number, limit: number, offset: number): Promise<{ notifications: Notification[], total: number }>;
  getUnreadCount(userId: number): Promise<number>;
  markAsRead(id: number, userId: number): Promise<boolean>;
  markAllAsRead(userId: number): Promise<boolean>;
  deleteNotification(id: number, userId: number): Promise<boolean>;
  createNotification?(data: { userId: number, clinicId?: number, type: string, title: string, message: string }): Promise<number | undefined>;
}
