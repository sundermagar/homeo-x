// ─── Socket.io Client ─────────────────────────────────────────────────────
// Centralized socket service for real-time features.

import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/shared/stores/auth-store';

const getSocketUrl = () => {
  const envUrl = import.meta.env['VITE_API_URL'];
  if (envUrl) return envUrl;
  return window.location.origin;
};

let socket: Socket | null = null;
let whatsappSocket: Socket | null = null;

// Track the userId the socket was created for so we can detect stale auth
let socketCreatedForUserId: string | number | undefined = undefined;

export function getSocket(): Socket {
  const token = useAuthStore.getState().token;
  const userId = useAuthStore.getState().user?.id;

  // If we have an existing socket but the user has changed (re-login),
  // tear down the old socket so a fresh one is created with correct auth.
  if (socket && socketCreatedForUserId !== userId) {
    socket.disconnect();
    socket = null;
    socketCreatedForUserId = undefined;
  }

  if (!socket) {
    socket = io(`${getSocketUrl()}/notifications`, {
      auth: { token, userId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      // Do NOT autoConnect here — caller must call socket.connect()
      autoConnect: false,
    });
    socketCreatedForUserId = userId;
  }

  // If the socket exists but is disconnected (e.g. after a brief network drop),
  // trigger a reconnect so the caller always gets a live socket.
  if (!socket.connected) {
    // Update auth in case the token was refreshed since the socket was created
    (socket as any).auth = { token, userId };
    socket.connect();
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    socketCreatedForUserId = undefined;
  }
}

// ─── WhatsApp Socket ───────────────────────────────────────────────────────

export function getWhatsAppSocket(channelId?: number): Socket {
  if (whatsappSocket && whatsappSocket.connected) {
    if (channelId !== undefined) {
      whatsappSocket.auth = { ...whatsappSocket.auth, channelId };
    }
    return whatsappSocket;
  }

  const token = useAuthStore.getState().token;
  const userId = useAuthStore.getState().user?.id;

  if (whatsappSocket) {
    // Reuse existing socket — just reconnect with refreshed auth
    (whatsappSocket as any).auth = { token, userId, channelId };
    whatsappSocket.connect();
    return whatsappSocket;
  }

  whatsappSocket = io(`${getSocketUrl()}/whatsapp`, {
    auth: { token, userId, channelId },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  return whatsappSocket;
}

export function disconnectWhatsAppSocket() {
  if (whatsappSocket) {
    whatsappSocket.disconnect();
    whatsappSocket = null;
  }
}