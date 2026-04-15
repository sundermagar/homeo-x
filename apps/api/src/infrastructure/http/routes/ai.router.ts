// ─── AI Router ────────────────────────────────────────────────────────────────
// Express routes for AI-powered consultation features.
// Migrated from: Ai-Counsultaion/apps/api/src/modules/ai/ai.controller.ts

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { getConsultationUseCase } from '../../../domains/consultation/consultation.use-case';
import { sendSuccess } from '../../../shared/response-formatter';
import { createLogger } from '../../../shared/logger';

const logger = createLogger('ai-router');

export const aiRouter: Router = Router();

// Helper to extract tenant/user from request (set by middleware)
function getTenant(req: Request): string {
  return (req as any).tenantId || 'default';
}
function getUserId(req: Request): string {
  return (req as any).user?.id || (req as any).userId || 'system';
}

// POST /api/ai/suggest/soap
aiRouter.post('/suggest/soap', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uc = getConsultationUseCase();
    const result = await uc.suggestSoap(getTenant(req), getUserId(req), req.body);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// POST /api/ai/consult/homeopathy — Full 7-phase pipeline
aiRouter.post('/consult/homeopathy', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extended timeout for the full pipeline (up to 90s)
    req.setTimeout(90_000);
    const uc = getConsultationUseCase();
    const result = await uc.consultHomeopathy(getTenant(req), getUserId(req), req.body);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// POST /api/ai/repertorize/extract — Rubric extraction
aiRouter.post('/repertorize/extract', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uc = getConsultationUseCase();
    const result = await uc.extractRubrics(getTenant(req), getUserId(req), req.body);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// POST /api/ai/repertorize/score — Remedy scoring
aiRouter.post('/repertorize/score', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uc = getConsultationUseCase();
    const result = await uc.scoreRemedies(getTenant(req), getUserId(req), req.body);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// POST /api/ai/case/extract — Clinical extraction
aiRouter.post('/case/extract', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uc = getConsultationUseCase();
    const result = await uc.extractCase(getTenant(req), getUserId(req), req.body);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// POST /api/ai/case/summary — Generate summary
aiRouter.post('/case/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uc = getConsultationUseCase();
    const result = await uc.generateSummary(getTenant(req), getUserId(req), req.body);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// POST /api/ai/translate — Text translation
aiRouter.post('/translate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uc = getConsultationUseCase();
    const result = await uc.translateText(getTenant(req), getUserId(req), req.body);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// POST /api/ai/suggest/questions — Generate follow-up questions from transcript
aiRouter.post('/suggest/questions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uc = getConsultationUseCase();
    const result = await uc.generateQuestions(getTenant(req), getUserId(req), req.body);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// POST /api/ai/parse-lab-report — Lab OCR
aiRouter.post('/parse-lab-report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uc = getConsultationUseCase();
    const result = await uc.parseLabReport(getTenant(req), getUserId(req), req.body);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// GET /api/ai/rubrics/kent-search — Kent Repertory search
aiRouter.get('/rubrics/kent-search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uc = getConsultationUseCase();
    const result = await uc.searchKentRubrics(String(req.query.q || ''));
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// POST /api/ai/feedback — Doctor feedback on AI suggestion
aiRouter.post('/feedback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info({ tenantId: getTenant(req), feedback: req.body }, 'AI feedback recorded');
    sendSuccess(res, { recorded: true });
  } catch (err) { next(err); }
});
