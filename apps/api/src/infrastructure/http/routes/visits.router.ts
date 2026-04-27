// ─── Visits Router ────────────────────────────────────────────────────────────
// Thin router that exposes /api/visits/:visitId/* endpoints the consultation
// page calls. Delegates to use cases that also back /api/medical-cases/* —
// the consultation flow uses the visits-prefixed paths because, in this app,
// "visit" === appointment.

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import * as schema from '@mmc/database/schema';
import { asyncHandler } from '../middleware/async-handler';
import { sendSuccess } from '../../../shared/response-formatter';
import { MedicalCaseRepositoryPg } from '../../repositories/medical-case.repository.pg';
import { ManageVitalsUseCase } from '../../../domains/medical-case/use-cases/manage-vitals.use-case';

export const visitsRouter: Router = Router();

const getVitalsUseCase = (req: Request) =>
  new ManageVitalsUseCase(new MedicalCaseRepositoryPg(req.tenantDb));

function parseVisitId(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw Object.assign(new Error('Invalid visitId'), { status: 400 });
  }
  return n;
}

// GET /api/visits/:visitId — return the appointment as the "visit" object,
// enriched with the patient sub-object the consultation UI expects
// (firstName / lastName / dateOfBirth / gender / mrn / phone / allergies).
visitsRouter.get('/:visitId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const visitId = parseVisitId(req.params.visitId);
    const db = req.tenantDb;

    const [appt] = await db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.id, visitId))
      .limit(1);

    if (!appt) {
      res.status(404).json({ success: false, error: 'Visit not found' });
      return;
    }

    // Look up the patient. appointment.patient_id maps to case_datas.id;
    // some legacy rows use regid instead, so try both.
    let patient: any = null;
    if (appt.patientId) {
      const byId = await db
        .select()
        .from(schema.patients)
        .where(eq(schema.patients.id, appt.patientId))
        .limit(1);
      patient = byId[0] ?? null;
      if (!patient) {
        const byRegid = await db
          .select()
          .from(schema.patients)
          .where(eq(schema.patients.regid, appt.patientId))
          .limit(1);
        patient = byRegid[0] ?? null;
      }
    }

    // Normalize patient shape for the consultation UI.
    // Falls back to splitting appt.patientName so the doctor still sees
    // a name even if the patient row is missing.
    const splitName = (s: string | null | undefined) => {
      const parts = (s || '').trim().split(/\s+/);
      return { firstName: parts[0] || 'Patient', lastName: parts.slice(1).join(' ') };
    };
    const fallback = splitName(appt.patientName);

    const dob = patient?.dob ?? patient?.dateOfBirth ?? null;
    const normalizedPatient = {
      id: patient?.id ?? appt.patientId,
      regid: patient?.regid ?? null,
      mrn: patient?.regid != null ? `PT-${patient.regid}` : (patient?.id != null ? `ID-${patient.id}` : ''),
      firstName: patient?.firstName ?? fallback.firstName,
      lastName: patient?.surname ?? fallback.lastName,
      gender: patient?.gender ?? null,
      dateOfBirth: dob,
      age: patient?.age ?? null,
      phone: patient?.phone ?? patient?.mobile1 ?? appt.phone ?? null,
      email: patient?.email ?? null,
      bloodGroup: patient?.bloodGroup ?? null,
      allergies: [] as string[],
      address: patient?.address ?? null,
      city: patient?.city ?? null,
    };

    // Normalize the legacy appointment status string to the canonical
    // visit-status enum the consultation UI expects:
    //   Pending / Confirmed / Arrived / Waitlist  → CHECKED_IN  (waiting room)
    //   Consultation / InProgress                 → IN_PROGRESS
    //   Completed / Done / Visited                → COMPLETED
    //   Cancelled / Absent                        → CANCELLED
    //   anything else                             → SCHEDULED
    const normalizeStatus = (s: string | null | undefined) => {
      const v = (s || '').toLowerCase();
      if (['consultation', 'inprogress', 'in_progress'].includes(v)) return 'IN_PROGRESS';
      if (['completed', 'done', 'visited'].includes(v)) return 'COMPLETED';
      if (['cancelled', 'canceled', 'absent'].includes(v)) return 'CANCELLED';
      if (['pending', 'confirmed', 'arrived', 'waitlist', 'scheduled'].includes(v)) return 'CHECKED_IN';
      return 'CHECKED_IN';
    };

    sendSuccess(res, {
      id: String(visitId),
      patientId: appt.patientId,
      doctorId: appt.doctorId,
      status: normalizeStatus(appt.status),
      rawStatus: appt.status,
      specialty: 'Homeopathy',
      visitType: appt.visitType,
      bookingDate: appt.bookingDate,
      bookingTime: appt.bookingTime,
      tokenNo: appt.tokenNo,
      notes: appt.notes,
      chiefComplaint: appt.notes ?? '',
      patientName: appt.patientName,
      phone: appt.phone,
      consultationFee: appt.consultationFee,
      createdAt: appt.createdAt,
      updatedAt: appt.updatedAt,
      patient: normalizedPatient,
      vitals: null,
    });
  } catch (err) { next(err); }
});

// POST /api/visits/:visitId/vitals — record vitals for a visit
visitsRouter.post('/:visitId/vitals', asyncHandler(async (req, res) => {
  const visitId = parseVisitId(req.params.visitId);
  await getVitalsUseCase(req).execute({ ...req.body, visitId });
  sendSuccess(res, null, 'Vitals recorded successfully');
}));

// GET /api/visits/:visitId/vitals — read vitals for a visit
visitsRouter.get('/:visitId/vitals', asyncHandler(async (req, res) => {
  const visitId = parseVisitId(req.params.visitId);
  const result = await getVitalsUseCase(req).get(visitId);
  if (!result.success) throw new Error(result.error);
  sendSuccess(res, result.data);
}));
