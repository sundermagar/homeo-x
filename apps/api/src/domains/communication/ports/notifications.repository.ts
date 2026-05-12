import type { Notification } from '@mmc/types';

export interface NotificationsRepository {
  getNotifications(userId: number, limit: number, offset: number): Promise<{ notifications: Notification[], total: number }>;
  getUnreadCount(userId: number): Promise<number>;
  markAsRead(id: number, userId: number): Promise<boolean>;
  markAllAsRead(userId: number): Promise<boolean>;
  deleteNotification(id: number, userId: number): Promise<boolean>;
  deleteAllNotifications(userId: number): Promise<boolean>;
  createNotification?(data: { userId: number, clinicId?: number, type: string, title: string, message: string }): Promise<number | undefined>;
  /**
   * Resolves a tenant `doctors.id` to the matching `users.id` (with type Doctor).
   * Handles legacy data where the two IDs do not align — falls back to email match.
   * Returns null when no Doctor user exists for that doctor row (notification should be skipped).
   */
  resolveUserIdForDoctor?(doctorId: number): Promise<number | null>;
  /** Returns user ids for everyone with one of the given roles, optionally scoped to a clinic. */
  findUserIdsByRole?(roles: string[], clinicId?: number): Promise<number[]>;
  /** Fetches lightweight context for a waitlist row so callers can compose notification messages. */
  getWaitlistContext?(waitlistId: number): Promise<{ doctorId: number | null; patientName: string | null; bookingTime: string | null } | null>;
}
