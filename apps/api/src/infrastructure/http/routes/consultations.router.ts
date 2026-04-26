// ─── Consultations Router ─────────────────────────────────────────────────────
// Persists consultation lifecycle to the tenant DB:
//   - start:    appointments.status -> 'Consultation'
//   - complete: upsert soap_notes, insert prescriptions, appointments.status -> 'Completed'
//   - summary:  joins appointment + patient + doctor + vitals + soap + prescriptions
//
// Tables used (real DB schema):
//   - appointments         (TS: schema.appointments)
//   - vitals               (TS: schema.vitals)
//   - soap_notes           (TS: schema.legacySoapNotes — integer visit_id, matches DB)
//   - prescriptions        (raw SQL — TS schemas don't match the migration 0004 table)
//   - rubrics, remedies    (TS: schema.rubrics, schema.remedies)
//   - patients (case_datas), users (public schema)

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { sql, eq } from 'drizzle-orm';
import * as schema from '@mmc/database/schema';
import { sendSuccess } from '../../../shared/response-formatter';
import { createLogger } from '../../../shared/logger';

const logger = createLogger('consultations-router');

export const consultationsRouter: Router = Router();

const HOMEOPATHY_SPECIALTY_CONFIG = {
  specialty: 'HOMEOPATHY',
  label: 'Homeopathy',
  soapFields: ['subjective', 'objective', 'assessment', 'plan'],
};

const HOMEOPATHY_UI_HINTS = {
  showPotencySelector: true,
  showRemedySelector: true,
  showRepeatPlanShortcut: true,
  prescriptionLabel: 'Remedy',
};

// Visit IDs come in as strings from the web — they're appointments.id (serial integer) cast to string.
function parseVisitId(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw Object.assign(new Error('Invalid visitId'), { status: 400 });
  }
  return n;
}

// IMPORTANT: register literal segments BEFORE the `:visitId` route, otherwise
// `/rubrics` would match `:visitId = 'rubrics'` and hit the summary handler.

// GET /api/consultations/rubrics?category=MIND&limit=100
consultationsRouter.get('/rubrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.tenantDb;
    const category = req.query.category as string | undefined;
    const limit = Math.min(Number(req.query.limit) || 100, 500);

    const rows = category
      ? await db.select().from(schema.rubrics).where(eq(schema.rubrics.category, category)).limit(limit)
      : await db.select().from(schema.rubrics).limit(limit);

    sendSuccess(res, rows);
  } catch (err) { next(err); }
});

// GET /api/consultations/remedies?limit=100
consultationsRouter.get('/remedies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.tenantDb;
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const rows = await db.select().from(schema.remedies).limit(limit);
    sendSuccess(res, rows);
  } catch (err) { next(err); }
});

// POST /api/consultations/start
consultationsRouter.post('/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const visitId = parseVisitId(req.body?.visitId);
    const db = req.tenantDb;

    const [appt] = await db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.id, visitId))
      .limit(1);

    if (!appt) {
      res.status(404).json({ success: false, error: 'Visit (appointment) not found' });
      return;
    }

    await db
      .update(schema.appointments)
      .set({ status: 'Consultation', updatedAt: new Date() })
      .where(eq(schema.appointments.id, visitId));

    logger.info({ tenantSlug: req.tenantSlug, visitId }, 'Consultation started');

    sendSuccess(res, {
      visit: {
        id: String(visitId),
        status: 'IN_PROGRESS',
        patientId: appt.patientId,
        doctorId: appt.doctorId,
        visitType: appt.visitType,
        startedAt: new Date().toISOString(),
      },
      templates: { soap: {}, prescriptionItem: {} },
      specialtyConfig: HOMEOPATHY_SPECIALTY_CONFIG,
      clinicCategory: 'HOMEOPATHY',
      prescriptionStrategy: 'SINGLE_REMEDY',
      uiHints: HOMEOPATHY_UI_HINTS,
    });
  } catch (err) { next(err); }
});

// POST /api/consultations/complete
consultationsRouter.post('/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const visitId = parseVisitId(req.body?.visitId);
    const { soap, prescription, autoApprove } = req.body ?? {};
    const db = req.tenantDb;

    const [appt] = await db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.id, visitId))
      .limit(1);

    if (!appt) {
      res.status(404).json({ success: false, error: 'Visit (appointment) not found' });
      return;
    }

    let savedSoap: any = null;
    let savedPrescription: any = null;

    await db.transaction(async (tx: any) => {
      // 1. Upsert SOAP note (unique on visit_id)
      if (soap) {
        const soapPayload: any = {
          visitId,
          subjective: soap.subjective ?? null,
          objective: soap.objective ?? null,
          assessment: soap.assessment ?? null,
          plan: soap.plan ?? null,
          advice: soap.advice ?? null,
          followUp: soap.followUp ?? null,
          icdCodes: soap.icdCodes ?? null,
          specialtyData: soap.specialtyData ?? null,
          aiGenerated: !!soap.aiGenerated,
          aiConfidence: typeof soap.confidence === 'number' ? soap.confidence : null,
          doctorApproved: !!autoApprove,
          approvedAt: autoApprove ? new Date() : null,
          updatedAt: new Date(),
        };

        const [existing] = await tx
          .select({ id: schema.legacySoapNotes.id })
          .from(schema.legacySoapNotes)
          .where(eq(schema.legacySoapNotes.visitId, visitId))
          .limit(1);

        if (existing) {
          const [updated] = await tx
            .update(schema.legacySoapNotes)
            .set(soapPayload)
            .where(eq(schema.legacySoapNotes.id, existing.id))
            .returning();
          savedSoap = updated;
        } else {
          const [inserted] = await tx
            .insert(schema.legacySoapNotes)
            .values(soapPayload)
            .returning();
          savedSoap = inserted;
        }
      }

      // 2. Insert each prescription item as a row in the legacy `prescriptions`
      //    table (migration 0004) — uses raw SQL because no TS schema matches it.
      if (prescription?.items?.length) {
        const consultationId = savedSoap?.id ?? null;
        const regid = appt.patientId;
        const insertedItems: any[] = [];

        for (const item of prescription.items as any[]) {
          const remedyName = item.medicationName ?? item.remedy ?? item.name ?? '';
          const potency = item.specialtyData?.potency ?? item.potency ?? item.dosage ?? null;
          const frequency = item.frequency ?? null;
          const duration = item.duration ?? null;
          const instructions = item.instructions ?? null;

          const result = (await tx.execute(sql`
            INSERT INTO "prescriptions"
              ("consultation_id", "regid", "remedy", "potency", "frequency", "duration", "instructions")
            VALUES
              (${consultationId}, ${regid}, ${remedyName},
               ${potency}, ${frequency}, ${duration}, ${instructions})
            RETURNING *
          `)) as any[];
          if (Array.isArray(result) && result[0]) insertedItems.push(result[0]);
        }

        savedPrescription = {
          id: `rx-visit-${visitId}`,
          visitId: String(visitId),
          notes: prescription.notes ?? '',
          items: insertedItems,
          doctorApproved: !!autoApprove,
          createdAt: new Date().toISOString(),
        };
      }

      // 3. Transition the appointment to Completed
      await tx
        .update(schema.appointments)
        .set({ status: 'Completed', updatedAt: new Date() })
        .where(eq(schema.appointments.id, visitId));

      // 4. Mark the corresponding waitlist row Done (status=2) so the patient
      //    moves out of the "In Progress" section of the queue. The dashboard
      //    and token-queue page filter by waitlist status, not appointment
      //    status, so without this update the patient stays stuck.
      try {
        await tx.execute(sql`
          UPDATE "waitlist"
             SET "status" = 2,
                 "completed_at" = NOW(),
                 "updated_at" = NOW()
           WHERE "appointment_id" = ${visitId}
             AND ("status" IS NULL OR "status" < 2)
        `);
      } catch (e: any) {
        // Non-fatal: some tenants may not have a waitlist row for every visit.
        logger.warn({ visitId, err: e?.message }, 'Could not update waitlist row to Done — non-fatal');
      }
    });

    logger.info(
      { tenantSlug: req.tenantSlug, visitId, soapId: savedSoap?.id, rxItems: savedPrescription?.items?.length ?? 0 },
      'Consultation completed',
    );

    sendSuccess(res, {
      visit: {
        id: String(visitId),
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
        patientId: appt.patientId,
        doctorId: appt.doctorId,
      },
      soap: savedSoap,
      prescription: savedPrescription,
    });
  } catch (err) { next(err); }
});

// GET /api/consultations/:visitId/summary
consultationsRouter.get('/:visitId/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const visitId = parseVisitId(req.params.visitId);
    const db = req.tenantDb;

    const [appt] = await db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.id, visitId))
      .limit(1);

    if (!appt) {
      res.status(404).json({ success: false, error: 'Visit (appointment) not found' });
      return;
    }

    const [patient] = appt.patientId
      ? await db.select().from(schema.patients).where(eq(schema.patients.id, appt.patientId)).limit(1)
      : [null as any];

    const [doctor] = appt.doctorId
      ? await db.select().from(schema.users).where(eq(schema.users.id, appt.doctorId)).limit(1)
      : [null as any];

    const [v] = await db
      .select()
      .from(schema.vitals)
      .where(eq(schema.vitals.visitId, visitId))
      .limit(1);

    const [s] = await db
      .select()
      .from(schema.legacySoapNotes)
      .where(eq(schema.legacySoapNotes.visitId, visitId))
      .limit(1);

    const rxRows = s
      ? ((await db.execute(sql`
          SELECT * FROM "prescriptions" WHERE "consultation_id" = ${s.id} ORDER BY "id"
        `)) as any[])
      : [];

    const doctorOut = doctor
      ? {
          id: String(doctor.id),
          firstName: (doctor as any).firstname ?? (doctor.name ?? '').split(' ')[0] ?? '',
          lastName: (doctor as any).surname ?? (doctor.name ?? '').split(' ').slice(1).join(' ') ?? '',
          email: doctor.email,
          qualifications: (doctor as any).qualification ?? null,
          specialization: (doctor as any).designation ?? null,
        }
      : null;

    sendSuccess(res, {
      visit: {
        id: String(visitId),
        status: appt.status,
        patientId: appt.patientId,
        doctorId: appt.doctorId,
        visitType: appt.visitType,
      },
      patient: patient ?? null,
      doctor: doctorOut,
      vitals: v ?? null,
      soap: s ?? null,
      prescriptions: rxRows,
      specialtyConfig: HOMEOPATHY_SPECIALTY_CONFIG,
      clinicCategory: 'HOMEOPATHY',
      uiHints: HOMEOPATHY_UI_HINTS,
    });
  } catch (err) { next(err); }
});
