import { Router } from 'express';
import type { Request, Response, Router as IRouter } from 'express';
import { createPatientSchema, updatePatientSchema, familyMemberSchema } from '@mmc/validation';
import { PatientRepositoryPg } from '../../repositories/patient.repository.pg.js';
import { OrganizationRepositoryPg } from '../../repositories/organization.repository.pg.js';
import { BillingRepositoryPg } from '../../repositories/billing.repository.pg.js';
import { MedicalCaseRepositoryPg } from '../../repositories/medical-case.repository.pg.js';
import {
  ListPatientsUseCase,
  GetPatientUseCase,
  CreatePatientUseCase,
  UpdatePatientUseCase,
  DeletePatientUseCase,
} from '../../../domains/patient/index.js';
import { requirePermission } from '../middleware/rbac.js';
import { authMiddleware } from '../middleware/auth.js';
import { Role } from '@mmc/types';
import { sql } from 'drizzle-orm';
import { WhatsAppRepositoryPG } from '../../repositories/whatsapp.repository.pg.js';
import { WhatsAppCloudGateway } from '../../communication/whatsapp-cloud-gateway.js';
import { SendWhatsAppTemplateUseCase } from '../../../domains/communication/use-cases/send-whatsapp-template.use-case.js';

export const patientRouter: IRouter = Router();

function getRepo(req: Request) {
  return new PatientRepositoryPg(req.tenantDb);
}

// GET /api/patients?search=&page=&limit=&sortBy=&sortOrder=
patientRouter.get('/', authMiddleware, requirePermission('PATIENT_VIEW'), async (req: Request, res: Response) => {
  try {
    const { search, page = '1', limit = '30', sortBy, sortOrder, doctor_id, clinicId } = req.query;
    
    // Determine clinic filter:
    // 1. If provided in query and user is Admin, use it.
    // 2. Otherwise, use user's contextId (clinicId).
    let effectiveClinicId = req.user?.contextId;
    if (clinicId && (req.user?.type === Role.Admin || req.user?.type === Role.SuperAdmin)) {
      effectiveClinicId = Number(clinicId);
    }

    // Doctor role: auto-scope to only their assigned/appointment patients
    let effectiveDoctorId = doctor_id ? Number(doctor_id) : undefined;
    if (req.user?.type === Role.Doctor && req.user?.id) {
      effectiveDoctorId = req.user.id;
    }

    const repo = getRepo(req);
    const uc = new ListPatientsUseCase(repo);
    const result = await uc.execute({
      page: Number(page),
      limit: Number(limit),
      search: search as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
      doctorId: effectiveDoctorId,
      clinicId: effectiveClinicId,
    });
    if (result.success) {
      res.json({ success: true, data: result.data.data, total: result.data.total });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/patients/lookup?query=
patientRouter.get('/lookup', authMiddleware, requirePermission('PATIENT_VIEW'), async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    if (!query || (query as string).length < 2) {
      res.json({ success: true, data: [] });
      return;
    }
    const repo = getRepo(req);
    
    // Determine clinic filter for lookup
    let clinicId = req.user?.contextId;
    if (req.query.clinicId && (req.user?.type === Role.Admin || req.user?.type === Role.SuperAdmin)) {
      clinicId = Number(req.query.clinicId);
    }

    // Doctor role: scope lookup to only their patients
    const lookupDoctorId = req.user?.type === Role.Doctor ? req.user?.id : undefined;

    const data = await repo.lookup(query as string, 20, clinicId, lookupDoctorId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/patients/meta/form
patientRouter.get('/meta/form', authMiddleware, async (req: Request, res: Response) => {
  try {
    const repo = getRepo(req);
    
    // Determine clinic filter
    let clinicId = req.user?.contextId;
    if (req.query.clinicId && (req.user?.type === Role.Admin || req.user?.type === Role.SuperAdmin)) {
      clinicId = Number(req.query.clinicId);
    }

    const meta = await repo.getFormMeta(clinicId);
    res.json({ success: true, data: meta });
  } catch (err: any) {
    console.error('CRITICAL PatientRouter Error:', err);
    res.status(500).json({ success: false, message: err.message, stack: err.stack });
  }
});

// GET /api/patients/meta/birthdays
patientRouter.get('/meta/birthdays', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { date } = req.query; // Expects MM-DD format, defaults to today
    const mmdd = (date as string) || new Date().toISOString().slice(5, 10);
    
    const repo = getRepo(req);
    const clinicId = req.user?.contextId;
    const data = await repo.findBirthdays(mmdd, clinicId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/patients/today — Today's new registrations
patientRouter.get('/today', authMiddleware, async (req: Request, res: Response) => {
  try {
    const repo = getRepo(req);
    const clinicId = req.user?.contextId;
    const data = await repo.findTodayRegistrations(clinicId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Family Group Endpoints ───

// GET /api/family-groups
patientRouter.get('/family-groups', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { search, page = '1', limit = '30' } = req.query;
    const repo = getRepo(req);
    const clinicId = (req as any).user?.contextId;
    const result = await repo.getFamilyGroups({
      page: Number(page),
      limit: Number(limit),
      search: search as string,
      clinicId,
    });
    res.json({ success: true, data: result.data, total: result.total });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/patients/:regid
patientRouter.get('/:regid', authMiddleware, requirePermission('PATIENT_VIEW'), async (req: Request, res: Response) => {
  try {
    const regid = Number(req.params.regid);
    if (isNaN(regid)) { res.status(400).json({ success: false, message: 'Invalid regid' }); return; }
    const repo = getRepo(req);
    const uc = new GetPatientUseCase(repo);
    const result = await uc.execute(regid);
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(404).json({ success: false, message: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/patients/:regid/history — aggregated past-visit history for the consultation sidebar.
// Reuses getUnifiedCaseData (vitals/soap/prescriptions/investigations) and groups it by visit.
patientRouter.get('/:regid/history', authMiddleware, requirePermission('PATIENT_VIEW'), async (req: Request, res: Response) => {
  try {
    const regid = Number(req.params.regid);
    if (isNaN(regid)) { res.status(400).json({ success: false, message: 'Invalid regid' }); return; }

    const repo = new MedicalCaseRepositoryPg(req.tenantDb);
    const full = await repo.getPatientHistory(regid);
    if (!full.patient) { res.status(404).json({ success: false, message: 'Patient not found' }); return; }

    const mc: any = {
      regid: full.patient.regid,
      patientName: [full.patient.firstName, full.patient.surname].filter(Boolean).join(' '),
      dateOfBirth: full.patient.dateOfBirth,
      gender: full.patient.gender,
    };
    const vitals: any[] = full.vitals || [];
    const soap: any[] = full.soap || [];
    const prescriptions: any[] = full.prescriptions || [];
    const investigations: any[] = full.investigations || [];
    const images: any[] = (full as any).images || [];

    const toDate = (v: any): string | null => {
      if (!v) return null;
      try { return new Date(v).toISOString(); } catch { return typeof v === 'string' ? v : null; }
    };
    const dayKey = (v: any): string => {
      const iso = toDate(v);
      return iso ? iso.slice(0, 10) : 'unknown';
    };
    type VisitBucket = {
      visitId: string | null;
      visitDate: string | null;
      chiefComplaint: string;
      assessment: string | null;
      advice: string | null;
      prescriptions: Array<{ remedyName: string; potency: string; dosage: string | null; instructions: string | null; frequency: string; days: number | string | null }>;
      vitals: any | null;
      labResults: Array<{ type: string; date: string | null; summary: string | null; data: unknown }>;
    };
    const buckets = new Map<string, VisitBucket>();
    // Group everything by the visit DATE (day). Legacy prescriptions carry a null visitId, so
    // keying purely by visitId would split a visit's SOAP note and its remedy into separate cards.
    // Day-based keying merges SOAP, prescriptions, vitals and labs from the same day into one visit.
    const ensure = (visitId: any, dateVal: any): VisitBucket => {
      const key = `d:${dayKey(dateVal)}`;
      let b = buckets.get(key);
      if (!b) {
        b = {
          visitId: visitId != null && visitId !== '' ? String(visitId) : null,
          visitDate: toDate(dateVal),
          chiefComplaint: '',
          assessment: null,
          advice: null,
          prescriptions: [],
          vitals: null,
          labResults: [],
        };
        buckets.set(key, b);
      }
      // Backfill the real visitId once any record on this day provides one (used to exclude the current visit).
      if ((b.visitId == null || b.visitId === '') && visitId != null && visitId !== '') b.visitId = String(visitId);
      if (!b.visitDate) b.visitDate = toDate(dateVal);
      return b;
    };

    for (const s of soap) {
      const date = s.visitDate || s.createdAt;
      const b = ensure(s.visitId, date);
      if (!b.chiefComplaint) b.chiefComplaint = s.subjective || '';
      if (!b.assessment) b.assessment = s.assessment || null;
      if (!b.advice) b.advice = s.advice || null;
    }

    for (const p of prescriptions) {
      const date = p.dateval || p.createdAt;
      const b = ensure(p.visitId, date);
      const days = p.days ?? p.rx_days;
      const freq = p.frequencyTitle || p.frequency_name || p.frequency;
      const dosage = [freq, days ? `${days} days` : null].filter(Boolean).join(' · ') || null;
      b.prescriptions.push({
        remedyName: p.medicineName || p.remedy_name || p.remedyName || '—',
        potency: p.potencyName || p.potency_name || p.potency || '',
        dosage,
        instructions: p.instructions || p.prescription || null,
        frequency: freq || '',
        days: days || null,
      });
    }

    for (const v of vitals) {
      const date = v.recordedAt;
      const b = ensure(v.visitId, date);
      // Keep the most recent vital for the visit (vitals are ordered desc, so first wins).
      if (!b.vitals) {
        b.vitals = {
          heightCm: v.heightCm ?? null,
          weightKg: v.weightKg ?? null,
          bmi: v.bmi ?? null,
          systolicBp: v.systolicBp ?? null,
          diastolicBp: v.diastolicBp ?? null,
          pulse: v.pulseRate ?? null,
          temperature: v.temperatureF ?? null,
          oxygenSaturation: v.oxygenSaturation ?? null,
          respiratoryRate: v.respiratoryRate ?? null,
          bloodSugar: v.bloodSugar ?? null,
          lmpDate: v.lmpDate ?? null,
        };
      }
    }

    for (const i of investigations) {
      const date = i.investDate || i.createdAt;
      const b = ensure(i.visitId, date);
      b.labResults.push({
        type: i.type || 'Investigation',
        date: toDate(date),
        summary: i.summary || null,
        data: i.data ?? null,
      });
    }

    for (const img of images) {
      const date = img.createdAt;
      const b = ensure(img.visitId, date);
      b.labResults.push({
        type: 'Media / Report',
        date: toDate(date),
        summary: img.description || 'Uploaded Media',
        data: { url: img.picture },
      });
    }

    const visits = Array.from(buckets.values())
      .sort((a, b) => (new Date(b.visitDate || 0).getTime()) - (new Date(a.visitDate || 0).getTime()));

    res.json({
      success: true,
      data: {
        patient: {
          regid: mc.regid ?? regid,
          name: mc.patientName || '',
          dateOfBirth: mc.dateOfBirth || null,
          gender: mc.gender || null,
          mrn: `PT-${mc.regid ?? regid}`,
        },
        visits,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/patients
patientRouter.post('/', authMiddleware, requirePermission('PATIENT_WRITE'), async (req: Request, res: Response) => {
  try {
    const parsed = createPatientSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const repo = getRepo(req);
    const billingRepo = new BillingRepositoryPg(req.tenantDb);
    const orgRepo = new OrganizationRepositoryPg(req.publicDb);
    const uc = new CreatePatientUseCase(repo, billingRepo, orgRepo);
    const clinicId = req.user?.contextId;
    const result = await uc.execute(parsed.data, clinicId);
    if (result.success) {
      res.status(201).json({ success: true, data: result.data.patient, regid: result.data.patient.regid, registrationBillId: (result.data as any).registrationBillId });
      
      // Auto WhatsApp to referring patient (Non-blocking background execution)
      let referrerId: number | null = null;
      if (req.body.referredById && !isNaN(Number(req.body.referredById))) {
        referrerId = Number(req.body.referredById);
      } else if (req.body.referredBy && !isNaN(Number(req.body.referredBy))) {
        referrerId = Number(req.body.referredBy);
      }
      
      if (referrerId) {
        (async () => {
          try {
            const referrer = await repo.findByRegid(referrerId);
            if (referrer && (referrer.phone || referrer.mobile1)) {
              const rawPhone = referrer.phone || referrer.mobile1 || '';
              const cleaned = rawPhone.replace(/\D/g, '');
              const finalPhone = cleaned.length === 10 ? `91${cleaned}` : cleaned;
              
              const org = clinicId ? await orgRepo.findById(clinicId) : null;
              const clinicName = org?.name || 'Clinic';
              
              const [dbTemplate] = await req.tenantDb.execute(sql`
                SELECT language FROM wa_templates WHERE name = 'thank_you_for_reference_v3' LIMIT 1
              `);
              const lang = (dbTemplate as any)?.language || 'en_US';

              const waRepo = new WhatsAppRepositoryPG(req.tenantDb);
              const waGateway = new WhatsAppCloudGateway(waRepo);
              const waUc = new SendWhatsAppTemplateUseCase(waGateway as any, waRepo);

              const referrerName = `${referrer.firstName} ${referrer.surname}`.trim();

              await waUc.execute({
                clinicId,
                phone: finalPhone,
                templateName: 'thank_you_for_reference_v3',
                language: lang,
                components: [
                  {
                    type: 'body',
                    parameters: [
                      { type: 'text', text: referrerName },
                      { type: 'text', text: clinicName }
                    ]
                  }
                ]
              });
              console.log(`[CreatePatient] Reference thank you message sent to ${referrerName} (${finalPhone})`);
            }
          } catch (waErr: any) {
            console.warn('[CreatePatient] Failed sending WhatsApp template to referring patient:', waErr.message);
          }
        })();
      }
    } else {
      res.status(400).json({ success: false, message: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/patients/:regid
patientRouter.put('/:regid', authMiddleware, requirePermission('PATIENT_WRITE'), async (req: Request, res: Response) => {
  try {
    const regid = Number(req.params.regid);
    if (isNaN(regid)) { res.status(400).json({ success: false, message: 'Invalid regid' }); return; }
    const parsed = updatePatientSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const repo = getRepo(req);
    const billingRepo = new BillingRepositoryPg(req.tenantDb);
    const uc = new UpdatePatientUseCase(repo, billingRepo);
    const result = await uc.execute(regid, parsed.data);
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(404).json({ success: false, message: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/patients/:regid
patientRouter.delete('/:regid', authMiddleware, requirePermission('DELETE_PATIENTS'), async (req: Request, res: Response) => {
  try {
    const regid = Number(req.params.regid);
    if (isNaN(regid)) { res.status(400).json({ success: false, message: 'Invalid regid' }); return; }
    const repo = getRepo(req);
    const uc = new DeletePatientUseCase(repo);
    const result = await uc.execute(regid);
    if (result.success) {
      res.json({ success: true, message: 'Patient deleted' });
    } else {
      res.status(404).json({ success: false, message: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/patients/:regid/family
patientRouter.get('/:regid/family', async (req: Request, res: Response) => {
  try {
    const regid = Number(req.params.regid);
    const repo = getRepo(req);
    const members = await repo.getFamilyMembers(regid);
    res.json({ success: true, data: members });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/patients/:regid/family
patientRouter.post('/:regid/family', async (req: Request, res: Response) => {
  try {
    const regid = Number(req.params.regid);
    const parsed = familyMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const repo = getRepo(req);
    const member = await repo.addFamilyMember(regid, parsed.data);
    res.status(201).json({ success: true, data: member });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/patients/:regid/family/:id
patientRouter.delete('/:regid/family/:id', authMiddleware, requirePermission('DELETE_PATIENTS'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const repo = getRepo(req);
    const deleted = await repo.removeFamilyMember(id);
    if (deleted) {
      res.json({ success: true, message: 'Family member removed' });
    } else {
      res.status(404).json({ success: false, message: 'Family member not found' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});
