import { Router } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthTokenPayload, Role } from '@mmc/types';
import { appConfig } from '../../../shared/config/app-config.js';
import { PatientRepositoryPg } from '../../repositories/patient.repository.pg.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { sendSuccess } from '../../../shared/response-formatter.js';
import { patients, unregisteredPatients } from '@mmc/database/schema';
import { and, or, eq, sql, isNull } from 'drizzle-orm';
import { BookAppointmentUseCase } from '../../../domains/appointment/use-cases/book-appointment.use-case.js';
import { CreatePatientUseCase } from '../../../domains/patient/use-cases/create-patient.js';
import { BillingRepositoryPg } from '../../repositories/billing.repository.pg.js';
import { OrganizationRepositoryPg } from '../../repositories/organization.repository.pg.js';
import { ManageVitalsUseCase } from '../../../domains/medical-case/use-cases/manage-vitals.use-case.js';
import { MedicalCaseRepositoryPg } from '../../repositories/medical-case.repository.pg.js';
import { StaffRepositoryPg } from '../../repositories/staff.repository.pg.js';
import { AppointmentRepositoryPG } from '../../repositories/appointment.repository.pg.js';
import { GetAppointmentUseCase } from '../../../domains/appointment/use-cases/get-appointment.use-case.js';
// Communication imports removed — messaging disabled during portal booking.
// import { CommunicationRepositoryPG } from '../../repositories/communication.repository.pg.js';
// import { createSmsGateway } from '../../communication/msg91-sms-gateway.js';
import { NotificationsRepositoryPg } from '../../repositories/notifications.repository.pg.js';
// WhatsApp imports removed — messaging is disabled during portal booking.
// Will be re-added when admin approval flow triggers WhatsApp.
// import { WhatsAppRepositoryPG } from '../../repositories/whatsapp.repository.pg.js';
// import { WhatsAppCloudGateway } from '../../communication/whatsapp-cloud-gateway.js';
// import { SendSmsUseCase } from '../../../domains/communication/use-cases/send-sms.use-case.js';
// import { SendWhatsAppTemplateUseCase } from '../../../domains/communication/use-cases/send-whatsapp-template.use-case.js';

export const portalRouter: Router = Router();

/**
 * POST /api/portal/lookup
 *
 * Public endpoint (no auth required).
 * Searches the patients table by mobile number (mobile1 or phone fields).
 * If a patient is found → auto-issues a JWT token and returns patient data.
 * If not found → returns { found: false }.
 *
 * Flow (from flowchart):
 *   Enter Mobile Number → Search Database → Patient Found? → YES/NO branch
 */
portalRouter.post(
  '/lookup',
  asyncHandler(async (req, res) => {
    try {
      const { phone } = req.body;

      if (!phone || typeof phone !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Mobile number is required',
        });
        return;
      }

      // Normalize the phone number — strip non-digits, handle +91 prefix
      const cleaned = phone.replace(/\D/g, '');
      // Support both 10-digit and 91+10-digit formats
      const searchVariants = [cleaned];
      if (cleaned.length === 10) {
        searchVariants.push(`91${cleaned}`, `+91${cleaned}`, `0${cleaned}`);
      } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
        searchVariants.push(cleaned.slice(2)); // 10-digit version
      }

      const repo = new PatientRepositoryPg(req.tenantDb);

      // Search across mobile1 and phone columns with all variants
      const searchConditions = searchVariants.flatMap((variant) => [
        sql`REPLACE(REPLACE(REPLACE(${patients.mobile1}, ' ', ''), '-', ''), '+', '') = ${variant.replace(/[+\- ]/g, '')}`,
        sql`REPLACE(REPLACE(REPLACE(${patients.phone}, ' ', ''), '-', ''), '+', '') = ${variant.replace(/[+\- ]/g, '')}`,
      ]);

      const rows = await req.tenantDb
        .select()
        .from(patients)
        .where(
          and(
            sql`(${patients.deletedAt} IS NULL OR ${patients.deletedAt}::text = '')`,
            or(...searchConditions),
          ),
        )
        .limit(1);

      const patient = rows[0];

      if (!patient) {
        // Patient NOT found → Check unregistered_patients
        const unregSearchConditions = searchVariants.map((variant) => 
          sql`REPLACE(REPLACE(REPLACE(${unregisteredPatients.phone}, ' ', ''), '-', ''), '+', '') = ${variant.replace(/[+\- ]/g, '')}`
        );

        const unregRows = await req.tenantDb
          .select()
          .from(unregisteredPatients)
          .where(
            and(
              isNull(unregisteredPatients.deletedAt),
              isNull(unregisteredPatients.registeredPatientId),
              or(...unregSearchConditions)
            )
          )
          .limit(1);

        const unregPatient = unregRows[0];

        if (!unregPatient) {
          console.log(`[Portal] No patient found for phone: ${phone}`);
          res.json({
            success: true,
            data: {
              found: false,
              phone: cleaned,
            },
          });
          return;
        }

        // Found in unregistered_patients
        console.log(`[Portal] ✅ Unregistered patient found: id=${unregPatient.id}, name=${unregPatient.name}`);
        const payload: AuthTokenPayload = {
          id: unregPatient.id,
          email: unregPatient.email || '',
          name: unregPatient.name,
          type: 'Patient' as Role,
          contextId: unregPatient.clinicId || 1,
          roleId: 0,
          roleName: 'Patient',
          regid: undefined, // undefined for unregistered
          phone: unregPatient.phone || '',
          isUnregistered: true,
        };

        const token = jwt.sign(payload, appConfig.jwt.secret as jwt.Secret, {
          expiresIn: appConfig.jwt.expiresIn as any,
        });

        sendSuccess(res, {
          found: true,
          token,
          user: {
            ...payload,
            permissions: {
              canAccessDashboard: true,
              canAccessQuickAccess: false,
              canViewPatientDetail: false,
              canCreatePatient: false,
              canEditPatient: false,
              canDeletePatient: false,
              canViewBilling: false,
              canViewExpenses: false,
              canViewAnalytics: false,
              canViewDoctors: false,
              canManageUsers: false,
              canManageSettings: false,
              canViewPackageHistory: false,
              canNewPatientBtn: false,
            },
          },
        });
        return;
      }

      // Patient FOUND → auto-issue JWT
      console.log(
        `[Portal] ✅ Patient found: regid=${patient.regid}, name=${patient.firstName} ${patient.surname}`,
      );

      const payload: AuthTokenPayload = {
        id: patient.id,
        email: patient.email || '',
        name: `${patient.firstName} ${patient.surname || ''}`.trim(),
        type: 'Patient' as Role,
        contextId: patient.clinicId || 0,
        roleId: 0,
        roleName: 'Patient',
        regid: patient.regid,
        phone: patient.mobile1 || patient.phone || '',
      };

      const token = jwt.sign(payload, appConfig.jwt.secret as jwt.Secret, {
        expiresIn: appConfig.jwt.expiresIn as any,
      });

      sendSuccess(res, {
        found: true,
        token,
        user: {
          ...payload,
          phone: patient.mobile1 || patient.phone || '',
          permissions: {
            canAccessDashboard: true,
            canAccessQuickAccess: false,
            canViewPatientDetail: false,
            canCreatePatient: false,
            canEditPatient: false,
            canDeletePatient: false,
            canViewBilling: false,
            canViewExpenses: false,
            canViewAnalytics: false,
            canViewDoctors: false,
            canManageUsers: false,
            canManageSettings: false,
            canViewPackageHistory: false,
            canNewPatientBtn: false,
          },
        },
      });
    } catch (err: any) {
      console.error('[Portal] Lookup Error:', err);
      res.status(500).json({ success: false, message: 'Lookup Error', error: err.message, stack: err.stack });
    }
  }),
);

/**
 * POST /api/portal/register
 * 
 * Public endpoint for minimal patient registration.
 * Accepts firstName, surname (or splits name), gender, phone, and optional age/dob.
 * Creates a new patient in the system and returns a JWT token.
 */
portalRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { name, phone, gender, age } = req.body;

    if (!name || !phone) {
      res.status(400).json({ success: false, message: 'Name and phone are required' });
      return;
    }

    // Split name into first and last
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0];
    const surname = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    // Calculate DOB from age if provided
    let dateOfBirth = null;
    if (age) {
      const today = new Date();
      dateOfBirth = new Date(today.getFullYear() - Number(age), today.getMonth(), today.getDate()).toISOString().split('T')[0];
    }

    const repo = new PatientRepositoryPg(req.tenantDb);
    
    // Check if phone already exists
    const existingRows = await req.tenantDb
      .select()
      .from(patients)
      .where(
        and(
          sql`(${patients.deletedAt} IS NULL OR ${patients.deletedAt}::text = '')`,
          or(
            eq(patients.mobile1, phone),
            eq(patients.phone, phone)
          )
        )
      )
      .limit(1);

    if (existingRows.length > 0) {
      const patient = existingRows[0]!;
      console.log(`[Portal] ✅ Existing patient found during register: regid=${patient.regid}`);

      const payload: AuthTokenPayload = {
        id: patient.id,
        email: patient.email || '',
        name: `${patient.firstName} ${patient.surname || ''}`.trim(),
        type: 'Patient' as Role,
        contextId: patient.clinicId || 0,
        roleId: 0,
        roleName: 'Patient',
        regid: patient.regid,
        phone: patient.mobile1 || patient.phone || '',
      };

      const token = jwt.sign(payload, appConfig.jwt.secret as jwt.Secret, {
        expiresIn: appConfig.jwt.expiresIn as any,
      });

      sendSuccess(res, {
        success: true,
        token,
        user: {
          ...payload,
          permissions: {
            canAccessDashboard: true,
            canAccessQuickAccess: false,
            canViewPatientDetail: false,
            canCreatePatient: false,
            canEditPatient: false,
            canDeletePatient: false,
            canViewBilling: false,
            canViewExpenses: false,
            canViewAnalytics: false,
            canViewDoctors: false,
            canManageUsers: false,
            canManageSettings: false,
            canViewPackageHistory: false,
            canNewPatientBtn: false,
          },
        },
      }, 'Login successful');
      return;
    }

    // Check if phone already exists in unregistered as well
    const existingUnregRows = await req.tenantDb
      .select()
      .from(unregisteredPatients)
      .where(
        and(
          isNull(unregisteredPatients.deletedAt),
          isNull(unregisteredPatients.registeredPatientId),
          eq(unregisteredPatients.phone, phone)
        )
      )
      .limit(1);

    if (existingUnregRows.length > 0) {
      const existing = existingUnregRows[0]!;
      console.log(`[Portal] ✅ Existing unregistered patient found during register: id=${existing.id}`);

      const payload: AuthTokenPayload = {
        id: existing.id,
        email: existing.email || '',
        name: existing.name,
        type: 'Patient' as Role,
        contextId: existing.clinicId || 1,
        roleId: 0,
        roleName: 'Patient',
        regid: undefined,
        phone: existing.phone || phone,
        isUnregistered: true,
      };

      const token = jwt.sign(payload, appConfig.jwt.secret as jwt.Secret, {
        expiresIn: appConfig.jwt.expiresIn as any,
      });

      sendSuccess(res, {
        success: true,
        token,
        user: {
          ...payload,
          permissions: {
            canAccessDashboard: true,
            canAccessQuickAccess: false,
            canViewPatientDetail: false,
            canCreatePatient: false,
            canEditPatient: false,
            canDeletePatient: false,
            canViewBilling: false,
            canViewExpenses: false,
            canViewAnalytics: false,
            canViewDoctors: false,
            canManageUsers: false,
            canManageSettings: false,
            canViewPackageHistory: false,
            canNewPatientBtn: false,
          },
        },
      }, 'Registration successful');
      return;
    }

    // Default clinicId to 1 for public registrations
    const newPatient = await repo.createUnregistered({
      name: `${firstName} ${surname}`.trim(),
      phone,
      gender: gender || 'Other',
      clinicId: 1
    });

    console.log(`[Portal] ✅ New unregistered patient registered: id=${newPatient.id}, name=${newPatient.name}`);

    const payload: AuthTokenPayload = {
      id: newPatient.id,
      email: '',
      name: newPatient.name,
      type: 'Patient' as Role,
      contextId: 1,
      roleId: 0,
      roleName: 'Patient',
      regid: undefined,
      phone,
      isUnregistered: true,
    };

    const token = jwt.sign(payload, appConfig.jwt.secret as jwt.Secret, {
      expiresIn: appConfig.jwt.expiresIn as any,
    });

    sendSuccess(res, {
      success: true,
      token,
      user: {
        ...payload,
        permissions: {
          canAccessDashboard: true,
          canAccessQuickAccess: false,
          canViewPatientDetail: false,
          canCreatePatient: false,
          canEditPatient: false,
          canDeletePatient: false,
          canViewBilling: false,
          canViewExpenses: false,
          canViewAnalytics: false,
          canViewDoctors: false,
          canManageUsers: false,
          canManageSettings: false,
          canViewPackageHistory: false,
          canNewPatientBtn: false,
        },
      },
    }, 'Registration successful');
  })
);

/**
 * GET /api/portal/profile
 *
 * Authenticated endpoint — requires JWT from portal lookup.
 * Returns the logged-in patient's profile data (address, contact, etc.)
 * Used by Follow-Up Wizard to pre-fill delivery address.
 */
portalRouter.get(
  '/profile',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const regid = req.user?.regid;
    if (!regid) {
      if (req.user?.isUnregistered) {
        const unregRows = await req.tenantDb
          .select()
          .from(unregisteredPatients)
          .where(eq(unregisteredPatients.id, req.user.id))
          .limit(1);
        
        const unreg = unregRows[0];
        if (!unreg) {
          res.status(404).json({ success: false, message: 'Patient not found' });
          return;
        }

        sendSuccess(res, {
          regid: 0,
          name: unreg.name,
          phone: unreg.phone || '',
          email: unreg.email || '',
          address: '',
          city: '',
          state: '',
          pin: '',
        });
        return;
      }
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const repo = new PatientRepositoryPg(req.tenantDb);
    const patient = await repo.findByRegid(regid);

    if (!patient) {
      res.status(404).json({ success: false, message: 'Patient not found' });
      return;
    }

    sendSuccess(res, {
      regid: patient.regid,
      name: `${patient.firstName} ${patient.surname || ''}`.trim(),
      phone: patient.mobile1 || patient.phone || '',
      email: patient.email || '',
      address: patient.address || '',
      city: patient.city || '',
      state: patient.state || '',
      pin: patient.pin || '',
    });
  }),
);

/**
 * POST /api/portal/upload-reports
 *
 * Authenticated endpoint — requires JWT from portal lookup.
 * Accepts up to 5 files (images/PDFs) for medical report upload.
 * Files are saved to the /uploads directory.
 * Used by both Visit Clinic and Follow-Up wizards.
 */
portalRouter.post(
  '/upload-reports',
  authMiddleware,
  upload.array('files', 5),
  asyncHandler(async (req, res) => {
    const files = req.files as Express.Multer.File[];
    const { patientId, appointmentId } = req.body;

    if (!files || files.length === 0) {
      res.status(400).json({ success: false, message: 'No files uploaded' });
      return;
    }

    const fs = await import('fs/promises');
    const path = await import('path');

    const uploadedPaths = await Promise.all(
      files.map(async (f) => {
        let finalFilename = f.filename;
        let finalPath = `/uploads/${f.filename}`;

        // If we have IDs, we rename the file so we can find it later without a DB
        if (patientId) {
          const timestamp = Date.now();
          const safeOriginalName = f.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
          finalFilename = `patient_${patientId}_appt_${appointmentId || 'NA'}_${timestamp}_${safeOriginalName}`;
          
          const oldFilePath = path.join(process.cwd(), 'uploads', f.filename);
          const newFilePath = path.join(process.cwd(), 'uploads', finalFilename);
          
          try {
            await fs.rename(oldFilePath, newFilePath);
            finalPath = `/uploads/${finalFilename}`;
          } catch (err) {
            console.error('Failed to rename file:', err);
            // Fallback to the original random UUID name if renaming fails
          }
        }

        return {
          filename: finalFilename,
          originalName: f.originalname,
          size: f.size,
          mimetype: f.mimetype,
          path: finalPath,
        };
      })
    );

    console.log(
      `[Portal] ✅ ${files.length} report(s) uploaded by patient regid=${req.user?.regid}`,
    );

    sendSuccess(res, {
      uploaded: uploadedPaths.length,
      files: uploadedPaths,
    });
  }),
);

/**
 * GET /api/portal/vitals/verify
 * Public endpoint to verify a vitals JWT token and fetch patient's name
 */
portalRouter.get(
  '/vitals/verify',
  asyncHandler(async (req, res) => {
    const token = req.query.token as string;
    if (!token) {
      res.status(400).json({ error: 'Token missing' });
      return;
    }

    try {
      const decoded = jwt.verify(token, appConfig.jwt.secret) as {
        patientId: number;
        appointmentId: number;
        patientName: string;
      };
      let gender = null;
      if (decoded.patientId && req.tenantDb) {
        const patientRepo = new PatientRepositoryPg(req.tenantDb);
        const patient = await patientRepo.findById(decoded.patientId);
        if (patient) {
          gender = patient.gender;
        }
      }
      
      sendSuccess(res, { patientName: decoded.patientName, gender });
    } catch (err) {
      res.status(400).json({ error: 'Invalid or expired token' });
    }
  })
);

/**
 * GET /api/portal/doctors
 * Public endpoint to fetch active doctors for the portal wizards.
 */
portalRouter.get('/doctors', asyncHandler(async (req, res) => {
  const repo = new StaffRepositoryPg(req.tenantDb);
  const result = await repo.findAll({ category: 'doctor', page: 1, limit: 100 });
  
  const doctors = result.data.map(d => ({
    id: Number(d.id),
    name: d.name,
    consultation_fee: d.consultationFee,
  }));
  
  res.json({ success: true, data: doctors });
}));

/**
 * GET /api/portal/slots
 * Public endpoint to fetch available slots for a doctor on a specific date.
 */
portalRouter.get('/slots', asyncHandler(async (req, res) => {
  const { doctorId, date } = req.query;
  if (!doctorId || !date) {
    res.status(400).json({ success: false, error: 'doctorId and date are required' });
    return;
  }
  
  const getAppts = new GetAppointmentUseCase(new AppointmentRepositoryPG(req.tenantDb));
  const result = await getAppts.getAvailability(Number(doctorId), date as string);
  
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error });
    return;
  }
  
  res.json({ success: true, data: result.data });
}));

/**
 * POST /api/portal/appointments
 * Public endpoint for new, unregistered patients to book an appointment (Video/Audio/Questions).
 */
portalRouter.post('/appointments', asyncHandler(async (req, res) => {
  const patientRepo = new PatientRepositoryPg(req.tenantDb);
  const notifRepo = new NotificationsRepositoryPg(req.tenantDb);
  const apptRepo = new AppointmentRepositoryPG(req.tenantDb);

  // WhatsApp and SMS are intentionally NOT passed here.
  // Notifications will be sent when the admin confirms the appointment,
  // not at booking time (appointment is saved as PENDING).
  const bookAppt = new BookAppointmentUseCase(
    apptRepo,
    undefined, // sms - disabled
    patientRepo,
    notifRepo,
    undefined, // whatsapp - disabled (moved to admin approval flow)
  );

  // Hardcode clinicId to 1 (main clinic) for public portal bookings if not provided
  const clinicId = req.body.clinicId || 1;
  const result = await bookAppt.execute({ ...req.body, clinicId });

  if (result.success) {
    let finalResponseData: any = result.data;

    // AUTO-CONVERSION LOGIC
    // If this appointment was booked for a staged (unregistered) patient,
    // convert them to a real patient in the main case_datas table now.
    if (req.body.unregisteredPatientId) {
      try {
        const db = req.tenantDb;
        const unregRows = await db.execute(sql`
          SELECT * FROM unregistered_patients WHERE id = ${req.body.unregisteredPatientId} LIMIT 1
        `);
        const unregPatient = unregRows[0] as any;

        if (unregPatient) {
          // Parse name into firstName and surname
          const nameStr = (unregPatient.name as string) || 'Patient';
          const nameParts = nameStr.split(' ');
          const firstName = nameParts[0] || 'Unknown';
          const surname = nameParts.slice(1).join(' ') || '';

          // Create the formal patient
          const billingRepo = new BillingRepositoryPg(req.tenantDb);
          const orgRepo = new OrganizationRepositoryPg(req.publicDb);
          const createPatientUc = new CreatePatientUseCase(patientRepo, billingRepo, orgRepo);
          
          const newPatientResult = await createPatientUc.execute({
            firstName,
            surname,
            phone: (unregPatient.phone as string) || '',
            email: (unregPatient.email as string) || undefined,
            gender: (unregPatient.gender as 'M' | 'F' | 'Other') || 'Other',
            dateOfBirth: (unregPatient.dob as string) || '2000-01-01', 
            courierOutstation: false,
            sendWelcomeEmail: false,
          }, clinicId);

          if (newPatientResult.success) {
            const newPatientId = newPatientResult.data.patient.id;
            const newRegId = newPatientResult.data.patient.regid;

            // Update the appointment to point to the real patient
            await db.execute(sql`
              UPDATE appointments 
              SET patient_id = ${newPatientId}, unregistered_patient_id = NULL 
              WHERE id = ${result.data.id}
            `);

            // Mark the unregistered record as registered to avoid duplicates
            await db.execute(sql`
              UPDATE unregistered_patients 
              SET registered_patient_id = ${newPatientId} 
              WHERE id = ${req.body.unregisteredPatientId}
            `);

            console.log(`[Auto-Convert] Converted staged patient ${req.body.unregisteredPatientId} to real patient ${newPatientId} (RegID: ${newRegId})`);
            
            // Send back the updated patient info so the frontend knows the new regid
            finalResponseData = {
              ...result.data,
              patientId: newPatientId,
              patient: newPatientResult.data.patient,
            };
          }
        }
      } catch (convertErr: any) {
        console.error('[Auto-Convert] Failed to auto-convert patient:', convertErr.message);
        // We don't fail the booking if conversion fails, they just stay as unregistered
      }
    }

    sendSuccess(res, finalResponseData, undefined, 201);
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
}));/**
 * POST /api/portal/vitals/submit
 * Public endpoint to submit vitals via JWT token securely
 */
portalRouter.post(
  '/vitals/submit',
  asyncHandler(async (req, res) => {
    const { token, height, weight, bpSystolic, bpDiastolic, pulse, temperature, spo2, lmp } = req.body;
    if (!token) {
      res.status(400).json({ error: 'Token missing' });
      return;
    }

    try {
      const decoded = jwt.verify(token, appConfig.jwt.secret) as {
        patientId: number;
        appointmentId: number;
      };
      
      const repo = new MedicalCaseRepositoryPg(req.tenantDb);
      const useCase = new ManageVitalsUseCase(repo);
      // Calculate BMI if height and weight are provided
      const h = Number(height);
      const w = Number(weight);
      let bmi: number | undefined;
      if (h > 0 && w > 0) {
        bmi = Number((w / ((h / 100) * (h / 100))).toFixed(2));
      }
      
      let notes = undefined;
      if (lmp) {
        notes = `LMP: ${lmp}`;
      }

      await useCase.execute({
        visitId: decoded.appointmentId,
        heightCm: height ? Number(height) : undefined,
        weightKg: weight ? Number(weight) : undefined,
        bmi,
        systolicBp: bpSystolic ? Number(bpSystolic) : undefined,
        diastolicBp: bpDiastolic ? Number(bpDiastolic) : undefined,
        pulseRate: pulse ? Number(pulse) : undefined,
        temperatureF: temperature ? Number(temperature) : undefined,
        oxygenSaturation: spo2 ? Number(spo2) : undefined,
        notes,
      });

      sendSuccess(res, { success: true }, 'Vitals recorded successfully');
    } catch (err) {
      res.status(400).json({ error: 'Invalid or expired token' });
    }
  })
);
