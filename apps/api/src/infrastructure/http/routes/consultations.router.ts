// ─── Consultations Router ─────────────────────────────────────────────────────
// Express routes for consultation workflow (start, complete, summary).
// Migrated from: Ai-Counsultaion/apps/api/src/modules/consultation/consultation.controller.ts

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../../shared/response-formatter';
import { createLogger } from '../../../shared/logger';

const logger = createLogger('consultations-router');

export const consultationsRouter: Router = Router();

function getTenant(req: Request): string {
  return (req as any).tenantId || 'default';
}

// POST /api/consultations/start — Transition visit to IN_PROGRESS
consultationsRouter.post('/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { visitId } = req.body;
    if (!visitId) {
      res.status(400).json({ success: false, error: 'visitId is required' });
      return;
    }

    logger.info({ tenantId: getTenant(req), visitId }, 'Starting consultation');

    // Return a successful start response with default templates
    // TODO: Integrate with actual visit status update + specialty config when DB layer is ready
    sendSuccess(res, {
      visit: { id: visitId, status: 'IN_PROGRESS' },
      templates: {
        soap: {},
        prescriptionItem: {},
      },
      specialtyConfig: {
        specialty: 'HOMEOPATHY',
        label: 'Homeopathy',
        soapFields: ['subjective', 'objective', 'assessment', 'plan'],
      },
      clinicCategory: 'HOMEOPATHY',
      prescriptionStrategy: 'SINGLE_REMEDY',
      uiHints: {
        showPotencySelector: true,
        showRemedySelector: true,
        showRepeatPlanShortcut: true,
        prescriptionLabel: 'Remedy',
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/consultations/complete — Save SOAP + Prescription, transition visit to COMPLETED
consultationsRouter.post('/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { visitId, soap, prescription, labOrders, autoApprove } = req.body;
    if (!visitId) {
      res.status(400).json({ success: false, error: 'visitId is required' });
      return;
    }

    const tenantId = getTenant(req);
    logger.info(
      { tenantId, visitId, hasSoap: !!soap, hasPrescription: !!prescription, hasLabOrders: !!(labOrders?.length) },
      'Completing consultation',
    );

    // Build the SOAP note response
    const soapNote = soap
      ? {
          id: `soap-${visitId}`,
          visitId,
          ...soap,
          doctorApproved: autoApprove ?? false,
          approvedAt: autoApprove ? new Date().toISOString() : null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      : null;

    // Build the prescription response
    const prescriptionResult = prescription?.items?.length
      ? {
          id: `rx-${visitId}`,
          visitId,
          notes: prescription.notes || '',
          items: prescription.items.map((item: any, idx: number) => ({
            id: `rx-item-${visitId}-${idx}`,
            ...item,
          })),
          doctorApproved: autoApprove ?? false,
          createdAt: new Date().toISOString(),
        }
      : null;

    // TODO: Persist SOAP, prescription, and lab orders to DB when persistence layer is complete
    // TODO: Transition visit status to COMPLETED in the visits table
    // TODO: Complete queue entry

    logger.info({ tenantId, visitId }, 'Consultation completed successfully');

    sendSuccess(res, {
      visit: { id: visitId, status: 'COMPLETED', completedAt: new Date().toISOString() },
      soap: soapNote,
      prescription: prescriptionResult,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/consultations/:visitId/summary — Get consultation summary
consultationsRouter.get('/:visitId/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { visitId } = req.params;
    logger.info({ tenantId: getTenant(req), visitId }, 'Fetching consultation summary');

    // TODO: Fetch from DB when persistence layer is complete
    sendSuccess(res, {
      visit: { id: visitId, status: 'COMPLETED' },
      patient: null,
      doctor: null,
      vitals: null,
      soap: null,
      prescriptions: [],
      specialtyConfig: { specialty: 'HOMEOPATHY', label: 'Homeopathy' },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/consultations/rubrics — List rubrics
consultationsRouter.get('/rubrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('Rubric search request');
    sendSuccess(res, []);
  } catch (err) {
    next(err);
  }
});

// GET /api/consultations/remedies — List remedies
consultationsRouter.get('/remedies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('Remedies search request');
    sendSuccess(res, []);
  } catch (err) {
    next(err);
  }
});
