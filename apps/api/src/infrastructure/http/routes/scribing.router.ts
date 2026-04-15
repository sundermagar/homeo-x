// ─── Scribing Router ──────────────────────────────────────────────────────────
// Express routes for ambient scribing sessions.
// Migrated from: Ai-Counsultaion/apps/api/src/modules/scribing/scribing.controller.ts

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
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
