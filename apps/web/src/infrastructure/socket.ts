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

export function getSocket(): Socket {
  if (socket && socket.connected) return socket;

  const token = useAuthStore.getState().token;
  const userId = useAuthStore.getState().user?.id;

  socket = io(`${getSocketUrl()}/notifications`, {
    auth: { token, userId },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}