// ─── useNotificationSocket ─────────────────────────────────────────────────
// Subscribes to real-time notifications via Socket.io.

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/infrastructure/socket';
import { useAuthStore } from '@/shared/stores/auth-store';
import { toast } from '@/hooks/use-toast';

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

    // Resume AudioContext if suspended (browser audio policy workaround)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Note 1: Warm triangle chime (C5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    // Note 2: Clean sine chime, slightly delayed (G5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, now + 0.08); // G5
    gain2.gain.setValueAtTime(0.0, now);
    gain2.gain.setValueAtTime(0.15, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.3);

    osc2.start(now + 0.08);
    osc2.stop(now + 0.5);

    // Clean up to prevent hardware context limits
    setTimeout(() => {
      if (ctx.state !== 'closed') {
        ctx.close().catch(() => {});
      }
    }, 600);
  } catch (e) {
    console.warn('[Audio] Failed to play notification sound', e);
  }
};

export function useNotificationSocket() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const userId = useAuthStore((state) => state.user?.id);
  const [isConnected, setIsConnected] = useState(false);

  const invalidateRealtimeQueries = () => {
    ['dashboard', 'appointments', 'bills', 'billing', 'queue', 'visit', 'patient'].forEach((key) => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  };

  useEffect(() => {
    if (!token || !userId) {
      setIsConnected(false);
      return () => undefined;
    }

    const socket = getSocket();
    setIsConnected(socket.connected);
    socket.connect();

    const handleNew = (notification: SocketNotification) => {
      playNotificationSound();

      toast({
        title: notification.title,
        description: notification.message,
        variant: notification.type === 'WHATSAPP'
          ? 'whatsapp'
          : (notification.type === 'error' || notification.type === 'warning') ? 'error' : 'default',
      });

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

      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      invalidateRealtimeQueries();
    };

    const handleConnected = (data: { userId: number }) => {
      console.debug('[Socket] Notification namespace connected for user', data.userId);
      setIsConnected(true);
    };

    const handleError = (err: { message?: string }) => {
      console.warn('[Socket] Notification error:', err?.message ?? err);
    };

    const handleConnectError = (err: Error) => {
      console.warn('[Socket] Notification connect_error:', err.message);
    };

    const handleDisconnect = (reason: string) => {
      console.warn('[Socket] Notification disconnected:', reason);
      setIsConnected(false);
    };

    const handleExternalUpdate = () => {
      invalidateRealtimeQueries();
    };

    socket.on('notification:new', handleNew);
    socket.on('billing:update', handleExternalUpdate);
    socket.on('appointment:update', handleExternalUpdate);
    socket.on('visit:update', handleExternalUpdate);
    socket.on('queueUpdated', handleExternalUpdate);
    socket.on('connected', handleConnected);
    socket.on('error', handleError);
    socket.on('connect_error', handleConnectError);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('notification:new', handleNew);
      socket.off('billing:update', handleExternalUpdate);
      socket.off('appointment:update', handleExternalUpdate);
      socket.off('visit:update', handleExternalUpdate);
      socket.off('queueUpdated', handleExternalUpdate);
      socket.off('connected', handleConnected);
      socket.off('error', handleError);
      socket.off('connect_error', handleConnectError);
      socket.off('disconnect', handleDisconnect);
    };
  }, [queryClient, token, userId]);

  return { isConnected };
}
