// ─── Scribing Router ──────────────────────────────────────────────────────────
// Express routes for ambient scribing sessions.
// Migrated from: Ai-Counsultaion/apps/api/src/modules/scribing/scribing.controller.ts

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import * as schema from '@mmc/database/schema';
import { sendSuccess } from '../../../shared/response-formatter';
import { createLogger } from '../../../shared/logger';
import { getConsultationUseCase } from '../../../domains/consultation/consultation.use-case';

const logger = createLogger('scribing-router');

export const scribingRouter: Router = Router();

function getTenant(req: Request): string {
  return (req as any).tenantId || 'default';
}
function getUserId(req: Request): string {
  return (req as any).user?.id || (req as any).userId || 'system';
}

// POST /api/scribing/generate-soap — Generate SOAP from transcript text directly
scribingRouter.post('/generate-soap', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uc = getConsultationUseCase();
    const { transcript, specialty, chiefComplaint, patientAge, patientGender, allergies } = req.body;

    const result = await uc.suggestSoap(getTenant(req), getUserId(req), {
      transcript: transcript || '',
      specialty: specialty || 'HOMEOPATHY',
      patientAge,
      patientGender,
      allergies,
    });

    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

// POST /api/scribing/generate-analysis — Full AI analysis from transcript
scribingRouter.post('/generate-analysis', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uc = getConsultationUseCase();
    const result = await uc.consultHomeopathy(getTenant(req), getUserId(req), {
      transcript: req.body.transcript || '',
      chiefComplaint: req.body.chiefComplaint,
      patientAge: req.body.patientAge,
      patientGender: req.body.patientGender,
      specialty: req.body.specialty || 'HOMEOPATHY',
    });

    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

// ─── Session lifecycle (backed by tenant scribing_sessions + transcript_segments) ─
// These endpoints make the ambient-scribe hooks (useCreateScribingSession,
// useScribingSession, useAddSegments, usePauseSession, useResumeSession,
// useEndSession) work without 404s. Tables already exist in the tenant schema.

const formatSession = (row: any) => row && ({
  id: String(row.id),
  visitId: row.visitId,
  tenantId: row.tenantId,
  userId: row.userId,
  status: row.status,
  language: row.language,
  totalDurationMs: row.totalDurationMs ?? 0,
  metadata: row.metadata ?? null,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

// POST /api/scribing/sessions — create or reuse the active session for a visit
scribingRouter.post('/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = (req as any).tenantDb;
    const visitId = String(req.body?.visitId ?? '');
    if (!visitId) { res.status(400).json({ success: false, error: 'visitId required' }); return; }

    const userId = (req as any).user?.id ?? null;
    const language = req.body?.language || 'hi-IN';

    const existing = await db.select().from(schema.scribingSessions).where(eq(schema.scribingSessions.visitId, visitId)).limit(1);
    if (existing[0]) {
      sendSuccess(res, formatSession(existing[0]));
      return;
    }

    const [created] = await db.insert(schema.scribingSessions).values({
      visitId,
      tenantId: (req as any).tenantSlug ?? null,
      userId,
      status: 'ACTIVE',
      language,
      totalDurationMs: 0,
    }).returning();
    sendSuccess(res, formatSession(created));
  } catch (err) { next(err); }
});

// GET /api/scribing/sessions/:visitId — fetch the active session for a visit (or null)
scribingRouter.get('/sessions/:visitId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = (req as any).tenantDb;
    const visitId = String(req.params.visitId);
    const [row] = await db.select().from(schema.scribingSessions).where(eq(schema.scribingSessions.visitId, visitId)).limit(1);
    sendSuccess(res, row ? formatSession(row) : null);
  } catch (err) { next(err); }
});

// GET /api/scribing/sessions/:visitId/public — same as above, no auth surface
scribingRouter.get('/sessions/:visitId/public', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = (req as any).tenantDb;
    const visitId = String(req.params.visitId);
    const [row] = await db.select().from(schema.scribingSessions).where(eq(schema.scribingSessions.visitId, visitId)).limit(1);
    sendSuccess(res, row ? formatSession(row) : null);
  } catch (err) { next(err); }
});

// POST /api/scribing/sessions/:sessionId/segments — append batched transcript segments
scribingRouter.post('/sessions/:sessionId/segments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = (req as any).tenantDb;
    const sessionId = Number(req.params.sessionId);
    const segments: any[] = Array.isArray(req.body?.segments) ? req.body.segments : [];
    if (segments.length === 0) { sendSuccess(res, { inserted: 0 }); return; }

    const rows = segments.map((s, idx) => ({
      sessionId,
      sequenceNumber: Number(s.sequenceNumber ?? idx),
      text: String(s.text ?? ''),
      speaker: String(s.speaker ?? 'DOCTOR'),
      confidence: typeof s.confidence === 'number' ? s.confidence : 1,
      startTimeMs: typeof s.startTimeMs === 'number' ? s.startTimeMs : null,
      endTimeMs: typeof s.endTimeMs === 'number' ? s.endTimeMs : null,
      isFinal: s.isFinal !== false,
      source: String(s.source ?? 'WEB_SPEECH_API'),
    }));

    await db.insert(schema.transcriptSegments).values(rows);
    sendSuccess(res, { inserted: rows.length });
  } catch (err) { next(err); }
});

const updateSessionStatus = async (req: Request, status: 'ACTIVE' | 'PAUSED' | 'COMPLETED') => {
  const db = (req as any).tenantDb;
  const sessionId = Number(req.params.sessionId);
  const [row] = await db
    .update(schema.scribingSessions)
    .set({ status, updatedAt: new Date() })
    .where(eq(schema.scribingSessions.id, sessionId))
    .returning();
  return row;
};

// PATCH /api/scribing/sessions/:sessionId/pause
scribingRouter.patch('/sessions/:sessionId/pause', async (req, res, next) => {
  try { sendSuccess(res, formatSession(await updateSessionStatus(req, 'PAUSED'))); } catch (err) { next(err); }
});

// PATCH /api/scribing/sessions/:sessionId/resume
scribingRouter.patch('/sessions/:sessionId/resume', async (req, res, next) => {
  try { sendSuccess(res, formatSession(await updateSessionStatus(req, 'ACTIVE'))); } catch (err) { next(err); }
});

// PATCH /api/scribing/sessions/:sessionId/end
scribingRouter.patch('/sessions/:sessionId/end', async (req, res, next) => {
  try { sendSuccess(res, formatSession(await updateSessionStatus(req, 'COMPLETED'))); } catch (err) { next(err); }
});

// PATCH /api/scribing/sessions/:sessionId — generic update (metadata / duration)
scribingRouter.patch('/sessions/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = (req as any).tenantDb;
    const sessionId = Number(req.params.sessionId);
    const patch: any = { updatedAt: new Date() };
    if (typeof req.body?.totalDurationMs === 'number') patch.totalDurationMs = req.body.totalDurationMs;
    if (req.body?.metadata !== undefined) patch.metadata = req.body.metadata;
    if (req.body?.language) patch.language = req.body.language;

    const [row] = await db
      .update(schema.scribingSessions)
      .set(patch)
      .where(eq(schema.scribingSessions.id, sessionId))
      .returning();
    sendSuccess(res, formatSession(row));
  } catch (err) { next(err); }
});

// POST /api/scribing/sessions/:sessionId/generate-soap — SOAP from accumulated transcript
scribingRouter.post('/sessions/:sessionId/generate-soap', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uc = getConsultationUseCase();
    const result = await uc.suggestSoap(getTenant(req), getUserId(req), {
      transcript: req.body?.transcript || '',
      specialty: req.body?.specialty || 'HOMEOPATHY',
      patientAge: req.body?.patientAge,
      patientGender: req.body?.patientGender,
      allergies: req.body?.allergies,
    });
    sendSuccess(res, result);
  } catch (err) { next(err); }
});
