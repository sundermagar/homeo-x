// ─── Video Call Router ───────────────────────────────────────────────────────
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../../shared/response-formatter';
import { createLogger } from '../../../shared/logger';
import { AccessToken } from 'livekit-server-sdk';

const logger = createLogger('video-call-router');
export const videoCallRouter: Router = Router();

function getUserId(req: Request): string {
  return (req as any).user?.id || (req as any).userId || 'system';
}

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'secret';
const LIVEKIT_URL = process.env.LIVEKIT_URL || process.env.VITE_LIVEKIT_URL || 'ws://127.0.0.1:7880';

// POST /api/video-call/token
videoCallRouter.post('/token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { visitId, role = 'host' } = req.body;
    if (!visitId) throw new Error('Missing visitId');

    const uid = getUserId(req);
    const roomName = `visit-${visitId}`;

    // Generate JWT via LiveKit Server SDK
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: `doctor-${uid}`,
      name: role,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true, 
      canSubscribe: true,
    });

    const token = await at.toJwt();

    sendSuccess(res, {
      token,
      channel: LIVEKIT_URL, // UI livekit adapter maps generic 'channel' argument to URL
      appId: 'livekit',
      uid: 1, 
      visitId,
      patientJoinLink: `/meet/${visitId}`,
    });
  } catch (err) { next(err); }
});

// GET /api/video-call/patient-token/:roomId
videoCallRouter.get('/patient-token/:roomId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roomId } = req.params;
    const roomName = `visit-${roomId}`;
    const uid = `patient-${Date.now()}`;

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: uid,
      name: 'patient',
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    sendSuccess(res, {
      token,
      channel: LIVEKIT_URL,
      appId: 'livekit',
      uid: 2, 
      visitId: roomId,
      patientJoinLink: `/meet/${roomId}`,
    });
  } catch (err) { next(err); }
});
