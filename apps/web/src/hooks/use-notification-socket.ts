// ─── useNotificationSocket ─────────────────────────────────────────────────
// Subscribes to real-time notifications via Socket.io.

import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket, disconnectSocket } from '@/infrastructure/socket';

export interface SocketNotification {
  id: number;
  userId: number;
  clinicId?: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // A pleasant "ding" sound
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);

    // Close the audio context after playback to prevent memory leaks 
    // and hitting the browser's hardware limit (~6 contexts max)
    setTimeout(() => {
      if (ctx.state !== 'closed') {
        ctx.close().catch(() => {});
      }
    }, 500);
  } catch (e) {
    // Browsers block audio until user interacts, fail silently if so
    console.warn('[Audio] Failed to play notification sound', e);
  }
};

export function useNotificationSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();

    const handleNew = (notification: SocketNotification) => {
      // Play sound immediately
      playNotificationSound();

      // Prepend new notification to the list, update unread count
      queryClient.setQueryData(['notifications', { limit: 20, offset: 0 }], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          notifications: [notification, ...(old.notifications ?? [])],
          pagination: { ...old.pagination, total: (old.pagination?.total ?? 0) + 1 },
        };
      });
      queryClient.setQueryData(['notifications', 'unreadCount'], (old: any) => {
        if (!old) return { unreadCount: 1 };
        return { unreadCount: (old.unreadCount ?? 0) + 1 };
      });
    };

    socket.on('notification:new', handleNew);
    socket.on('connected', (data: { userId: number }) => {
      console.log('[Socket] Connected to notifications namespace, userId:', data.userId);
    });
    socket.on('error', (err: { message: string }) => {
      console.warn('[Socket] Notification error:', err.message);
    });

    return () => {
      socket.off('notification:new', handleNew);
      socket.off('connected');
      socket.off('error');
    };
  }, [queryClient]);

  return { isConnected: getSocket().connected };
}