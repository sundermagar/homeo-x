// ─── Notifications Gateway ──────────────────────────────────────────────────
// Socket.io namespace for real-time notification delivery.
// Each authenticated user joins a personal room keyed by `user:{userId}`.

import type { Server, Socket } from 'socket.io';
import { createLogger } from '../../../shared/logger.js';

const logger = createLogger('notifications-gateway');

export interface NotificationEvent {
  id: number;
  userId: number;
  clinicId?: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// Maps socket.id → userId (after authentication)
const socketUserMap = new Map<string, number>();

export function setupNotificationsGateway(io: Server) {
  const notifNs = io.of('/notifications');

  notifNs.on('connection', (client: Socket) => {
    logger.info(`Notification socket connected: ${client.id}`);

    // Authenticate via JWT in handshake auth
    const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
    const userId = client.handshake.auth?.userId as number | undefined;

    if (!token || !userId) {
      logger.warn(`[NOTIF] Unauthenticated socket ${client.id}, disconnecting`);
      client.emit('error', { message: 'Authentication required' });
      client.disconnect(true);
      return;
    }

    // Map socket to user
    socketUserMap.set(client.id, userId);

    // Join personal room so we can target this specific user
    const room = `user:${userId}`;
    client.join(room);
    logger.info(`[NOTIF] User ${userId} joined room ${room}`);

    // Send confirmation to client
    client.emit('connected', { userId, room });

    client.on('disconnect', () => {
      socketUserMap.delete(client.id);
      logger.info(`[NOTIF] User ${userId} disconnected`);
    });

    // Optional: allow client to request unread count via socket
    client.on('get-unread', async () => {
      // This is handled via REST API instead; keep socket for server→client push only
    });
  });

  // ─── Helper: emit to a specific user ────────────────────────────────────
  // Call this from route handlers or domain services after creating a notification.
  function emitToUser(userId: number, event: NotificationEvent) {
    const room = `user:${userId}`;
    notifNs.to(room).emit('notification:new', event);
    logger.info(`[NOTIF] Emitted notification ${event.id} to user ${userId}`);
  }

  // ─── Helper: emit to all users in a clinic ──────────────────────────────
  function emitToClinic(clinicId: number, event: NotificationEvent) {
    const room = `clinic:${clinicId}`;
    notifNs.to(room).emit('notification:new', event);
    logger.info(`[NOTIF] Emitted notification ${event.id} to clinic ${clinicId}`);
  }

  return { emitToUser, emitToClinic, notifNs };
}

// ─── Singleton reference to emit notifications from outside the gateway ────
// Set during app.ts initialization
let _emitToUser: ((userId: number, event: NotificationEvent) => void) | null = null;
let _emitToClinic: ((clinicId: number, event: NotificationEvent) => void) | null = null;

export function setNotificationEmitters(
  emitUser: (userId: number, event: NotificationEvent) => void,
  emitClinic: (clinicId: number, event: NotificationEvent) => void
) {
  _emitToUser = emitUser;
  _emitToClinic = emitClinic;
}

export function emitNotificationToUser(userId: number, event: NotificationEvent) {
  _emitToUser?.(userId, event);
}

export function emitNotificationToClinic(clinicId: number, event: NotificationEvent) {
  _emitToClinic?.(clinicId, event);
}