// ─── Video Call Gateway ───────────────────────────────────────────────────────
// Socket.IO namespace: /video-call
// Handles real-time doctor ↔ patient signalling:
//   - call:join    → Doctor/Patient joins a room keyed by visitId
//   - call:send-question → Doctor sends a question to patient's screen
//   - call:leave   → Doctor ends the call; patient is notified

import type { Server } from 'socket.io';
import { createLogger } from '../../../shared/logger';

const logger = createLogger('video-call-gateway');

export function setupVideoCallGateway(io: Server) {
  const ns = io.of('/video-call');

  ns.on('connection', (socket) => {
    logger.info(`[VIDEO-CALL] Connected: ${socket.id}`);

    // ── call:join ─────────────────────────────────────────────────────────────
    // Both doctor and patient join a room named after the visitId so that
    // subsequent events are only delivered to participants of that visit.
    socket.on('call:join', (data: { visitId: string; speaker: 'DOCTOR' | 'PATIENT' }) => {
      const { visitId, speaker } = data || {};
      if (!visitId) return;
      socket.join(visitId);
      logger.info(`[VIDEO-CALL] ${speaker} joined room ${visitId} (socket ${socket.id})`);
    });

    // ── call:send-question ────────────────────────────────────────────────────
    // Doctor emits this when they click a suggested question.
    // We relay it to everyone else in the room (i.e., the patient) as call:question.
    socket.on('call:send-question', (data: { visitId: string; question: string }) => {
      const { visitId, question } = data || {};
      if (!visitId || !question) return;
      logger.info(`[VIDEO-CALL] Question → room ${visitId}: "${question.slice(0, 60)}"`);
      // Broadcast to everyone in the room EXCEPT the sender (the doctor already sees the question)
      socket.to(visitId).emit('call:question', { visitId, question });
    });

    // ── call:leave ────────────────────────────────────────────────────────────
    // Doctor emits this when they end the call. Patient receives 'call:ended'.
    socket.on('call:leave', (data?: { visitId?: string }) => {
      // If the doctor provided a visitId, emit directly to that room;
      // otherwise fall back to all rooms this socket is in.
      if (data?.visitId) {
        socket.to(data.visitId).emit('call:ended', { visitId: data.visitId });
        logger.info(`[VIDEO-CALL] Doctor left room ${data.visitId}`);
      } else {
        // Broadcast leave to every room this socket has joined
        for (const room of socket.rooms) {
          if (room !== socket.id) {
            socket.to(room).emit('call:ended', { visitId: room });
            logger.info(`[VIDEO-CALL] Doctor left room ${room}`);
          }
        }
      }
    });

    socket.on('disconnect', () => {
      logger.info(`[VIDEO-CALL] Disconnected: ${socket.id}`);
    });
  });

  logger.info('Video Call gateway initialized on /video-call namespace');
}
