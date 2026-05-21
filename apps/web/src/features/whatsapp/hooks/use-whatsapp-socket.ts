// ─── useWhatsAppSocket ────────────────────────────────────────────────────
// Connects to the /whatsapp Socket.io namespace and invalidates React Query
// caches when real-time events arrive (new messages, status updates).

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getWhatsAppSocket, disconnectWhatsAppSocket } from '@/infrastructure/socket';
import { toast } from '@/hooks/use-toast';
import type { Socket } from 'socket.io-client';

interface UseWhatsAppSocketOptions {
  channelId?: number;
  selectedConversationId?: number | null;
}

export function useWhatsAppSocket({ channelId, selectedConversationId }: UseWhatsAppSocketOptions) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const prevConvRef = useRef<number | null>(null);

  useEffect(() => {
    if (!channelId) return;

    const socket = getWhatsAppSocket(channelId);
    socketRef.current = socket;

    // ── Channel room ──────────────────────────────────────────────────────
    // The backend auto-joins the channel room based on the auth handshake,
    // but we also emit an explicit join just in case.
    socket.emit('join_channel', channelId);

    // ── Incoming message on any conversation in this channel ─────────────
    const handleMessageReceived = (payload: {
      channelId: number;
      conversationId: number;
      message: any;
    }) => {
      // Invalidate the conversation list so unread badges update
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations', channelId] });

      // If the user is viewing this exact conversation, also refresh its messages
      if (payload.conversationId === selectedConversationId) {
        queryClient.invalidateQueries({
          queryKey: ['whatsapp', 'messages', payload.conversationId],
        });
      }
    };

    // ── New message in the active conversation room ─────────────────────
    const handleNewMessage = (message: any) => {
      if (selectedConversationId) {
        queryClient.invalidateQueries({
          queryKey: ['whatsapp', 'messages', selectedConversationId],
        });
        // Also refresh conversations to update last message preview
        queryClient.invalidateQueries({
          queryKey: ['whatsapp', 'conversations', channelId],
        });
      }
    };

    // ── Status updates (delivered / read / failed) ──────────────────────
    const handleMessageStatus = (payload: { messageId: string; status: string }) => {
      if (selectedConversationId) {
        queryClient.invalidateQueries({
          queryKey: ['whatsapp', 'messages', selectedConversationId],
        });
      }
    };

    socket.on('message_received', handleMessageReceived);
    socket.on('new_message', handleNewMessage);
    socket.on('message_status', handleMessageStatus);

    return () => {
      socket.off('message_received', handleMessageReceived);
      socket.off('new_message', handleNewMessage);
      socket.off('message_status', handleMessageStatus);
      socket.emit('leave_channel', channelId);
    };
  }, [channelId, selectedConversationId, queryClient]);

  // ── Dynamic conversation room management ──────────────────────────────
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    // Leave previous conversation room
    if (prevConvRef.current && prevConvRef.current !== selectedConversationId) {
      socket.emit('leave_conversation', prevConvRef.current);
    }

    // Join new conversation room
    if (selectedConversationId) {
      socket.emit('join_conversation', selectedConversationId);
    }

    prevConvRef.current = selectedConversationId ?? null;
  }, [selectedConversationId]);

  // ── Cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      disconnectWhatsAppSocket();
    };
  }, []);
}
