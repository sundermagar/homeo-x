import type { Server, Socket } from 'socket.io';
import { createLogger } from '../../../shared/logger.js';

const logger = createLogger('whatsapp-gateway');

export function setupWhatsAppGateway(io: Server) {
  const whatsappNs = io.of('/whatsapp');

  whatsappNs.on('connection', (client: Socket) => {
    logger.info(`WhatsApp socket connected: ${client.id}`);

    // Join channel-specific rooms if provided in handshake
    const channelId = client.handshake.auth?.channelId || client.handshake.query?.channelId;
    if (channelId) {
      client.join(`channel:${channelId}`);
      logger.info(`Socket ${client.id} joined room channel:${channelId}`);
    }

    client.on('join_conversation', (conversationId: number) => {
      client.join(`conversation:${conversationId}`);
      logger.info(`Socket ${client.id} joined room conversation:${conversationId}`);
    });

    client.on('leave_conversation', (conversationId: number) => {
      client.leave(`conversation:${conversationId}`);
      logger.info(`Socket ${client.id} left room conversation:${conversationId}`);
    });

    client.on('disconnect', () => {
      logger.info(`WhatsApp socket disconnected: ${client.id}`);
    });
  });

  return {
    emitMessage: (channelId: number, conversationId: number, message: any) => {
      // Emit to channel room (for inbox list updates)
      whatsappNs.to(`channel:${channelId}`).emit('message_received', { channelId, conversationId, message });
      // Emit to conversation room (for active chat window updates)
      whatsappNs.to(`conversation:${conversationId}`).emit('new_message', message);
    },
    emitStatus: (conversationId: number, messageId: string, status: string) => {
      whatsappNs.to(`conversation:${conversationId}`).emit('message_status', { messageId, status });
    },
    whatsappNs
  };
}

let _whatsappGateway: any = null;

export function setWhatsAppGateway(gateway: any) {
  _whatsappGateway = gateway;
}

export function getWhatsAppGateway() {
  return _whatsappGateway;
}
