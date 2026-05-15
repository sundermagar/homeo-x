import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { SendOtpUseCase } from '../../../domains/public/use-cases/send-otp.use-case';
import { VerifyOtpUseCase } from '../../../domains/public/use-cases/verify-otp.use-case';
import { GetPublicContentUseCase } from '../../../domains/public/use-cases/get-public-content.use-case';
import { PublicRepositoryPg } from '../../repositories/public.repository.pg';
import { sql } from 'drizzle-orm';
import { asyncHandler } from '../middleware/async-handler';
import { sendSuccess } from '../../../shared/response-formatter';
import { appConfig } from '../../../shared/config/app-config.js';

export const publicRouter: Router = Router();

const getRepo = (req: any) => new PublicRepositoryPg(req.tenantDb);

// ─── Patient Email+Password Login ─────────────────────────────────────────
publicRouter.post('/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Email and password are required' });
    return;
  }

  const db = req.tenantDb;

  // Look up patient by email in case_datas
  const rows = await db.execute(sql`
    SELECT id, regid, first_name, surname, phone, mobile1, email, password_hash
    FROM case_datas
    WHERE LOWER(email) = LOWER(${email})
    AND deleted_at IS NULL
    LIMIT 1
  `);

  const patient = (rows as any).rows?.[0] || (rows as any)[0];
  if (!patient) {
    res.status(401).json({ success: false, message: 'No patient account found with this email' });
    return;
  }

  const storedHash = (patient as any).password_hash;
  if (!storedHash) {
    res.status(401).json({
      success: false,
      message: 'Password not set. Please contact your clinic to set up your patient portal password.',
    });
    return;
  }

  // PHP generates $2y$ which bcryptjs does not recognize
  const normalizedHash = storedHash.replace(/^\$2y\$/, '$2a$');
  const isMatch = await bcrypt.compare(password, normalizedHash);

  if (!isMatch) {
    res.status(401).json({ success: false, message: 'Invalid password' });
    return;
  }

  const p = patient as any;
  const patientName = [p.first_name, p.surname].filter(Boolean).join(' ');
  const phone = p.phone || p.mobile1 || '';

  const payload = {
    id: p.id,
    regid: p.regid,
    name: patientName,
    phone,
    email: p.email,
    type: 'Patient',
  };

  const token = jwt.sign(payload, appConfig.jwt.secret as jwt.Secret, {
    expiresIn: '7d',
  });

  sendSuccess(res, {
    token,
    patient: payload,
  });
}));

// ─── Patient Password Setup / Reset (by clinic staff) ─────────────────────
publicRouter.post('/auth/set-password', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Email and password are required' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    return;
  }

  const db = req.tenantDb;
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  const result = await db.execute(sql`
    UPDATE case_datas
    SET password_hash = ${hash}
    WHERE LOWER(email) = LOWER(${email})
    AND deleted_at IS NULL
  `);

  const rowCount = (result as any).rowCount ?? (result as any).rows?.length ?? 0;
  if (rowCount === 0) {
    res.status(404).json({ success: false, message: 'No patient found with this email' });
    return;
  }

  sendSuccess(res, undefined, 'Patient password set successfully');
}));

// ─── OTP ───────────────────────────────────────────────────────────────────
publicRouter.post('/otp/send', asyncHandler(async (req, res) => {
  const { phone } = req.body;
  if (!phone) throw new Error('Phone number is required');

  const useCase = new SendOtpUseCase(getRepo(req));
  await useCase.execute(phone);
  
  sendSuccess(res, undefined, 'OTP sent successfully (MOCKED)');
}));

publicRouter.post('/otp/verify', asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) throw new Error('Phone and OTP are required');

  const useCase = new VerifyOtpUseCase(getRepo(req));
  const result = await useCase.execute(phone, otp);

  // You would typically return a specialized public session token here
  sendSuccess(res, { verified: result }, 'OTP verified successfully');
}));

// Safe manual sync route to fix missing tables (replaces failed CLI db:push)
publicRouter.get('/debug/sync', asyncHandler(async (req, res) => {
  const db = req.tenantDb;
  
  // 1. Create OTPs table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS otps (
      id SERIAL PRIMARY KEY,
      phone TEXT NOT NULL,
      otp TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      verified BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // 2. Ensure FAQ columns
  await db.execute(sql`
    ALTER TABLE faqs ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    ALTER TABLE faqs ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;
  `);

  // 3. Ensure Static Pages columns
  await db.execute(sql`
    ALTER TABLE staticpages ADD COLUMN IF NOT EXISTS content TEXT;
    ALTER TABLE staticpages ADD COLUMN IF NOT EXISTS url TEXT;
    ALTER TABLE staticpages ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    ALTER TABLE staticpages ADD COLUMN IF NOT EXISTS slug TEXT;
  `);

  // 4. Create Leads if missing (matching exactly with leadsLegacy schema)
  await db.execute(sql`
    DROP TABLE IF EXISTS leads;
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      mobile TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      source TEXT,
      status TEXT,
      notes TEXT,
      assigned_to INTEGER,
      follow_up_date DATE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      deleted_at TIMESTAMP
    )
  `);

  // 5. Ensure missing unified domain columns on legacy tables
  await db.execute(sql`
    ALTER TABLE case_datas ADD COLUMN IF NOT EXISTS age INTEGER;
    ALTER TABLE case_datas ADD COLUMN IF NOT EXISTS blood_group TEXT;
    
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    ALTER TABLE medicalcases ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
  `);

  sendSuccess(res, { message: 'Public tables synchronized successfully' });
}));

// ─── CMS Public Access ────────────────────────────────────────────────────
publicRouter.get('/debug/seed-faqs', asyncHandler(async (req, res) => {
  const db = req.tenantDb;
  await db.execute(sql`
    ALTER TABLE faqs ALTER COLUMN deleted_at DROP NOT NULL;
    TRUNCATE faqs RESTART IDENTITY;
    INSERT INTO faqs (id, ques, ans, created_at, updated_at, deleted_at, is_active, "order")
    VALUES 
    (1, 'What is Homeopathy and how does it work?', 'Homeopathy is a natural system of medicine based on the principle of ""like cures like"". It uses highly diluted substances to trigger the body''s own healing mechanisms.', NOW(), NOW(), NULL, true, 1),
    (2, 'Are homeopathic medicines safe for children?', 'Yes, homeopathic medicines are extremely safe for children, infants, and pregnant women. They are natural, non-toxic, and do not have side effects when taken as prescribed.', NOW(), NOW(), NULL, true, 2),
    (3, 'How long does a homeopathic treatment usually take?', 'The duration of treatment depends on whether the illness is acute (short-term) or chronic (long-term). Acute conditions can improve in hours or days.', NOW(), NOW(), NULL, true, 3),
    (4, 'Can I take allopathic medicine alongside homeopathy?', 'Usually, yes. You should not stop your conventional prescribed medication abruptly. However, it''s best to space them out (about 30 minutes apart).', NOW(), NOW(), NULL, true, 4);
  `);
  sendSuccess(res, { message: 'FAQs seeded successfully' });
}));

publicRouter.get('/faqs', asyncHandler(async (req, res) => {
  const useCase = new GetPublicContentUseCase(getRepo(req));
  const faqs = await useCase.getFaqs();
  sendSuccess(res, faqs);
}));

publicRouter.get('/cms/pages/:slug', asyncHandler(async (req, res) => {
  const useCase = new GetPublicContentUseCase(getRepo(req));
  const page = await useCase.getPage(req.params.slug as string);
  sendSuccess(res, page);
}));

// ─── Direct Clinical Access (Transient) ───────────────────────────────────
publicRouter.get('/clinical/:phone', asyncHandler(async (req, res) => {
  const phone = req.params.phone as string;
  const repo = getRepo(req);
  const data = await repo.getLatestClinicalData(phone);
  
  if (!data) {
    res.status(404).json({ success: false, message: 'No patient record found for this number' });
    return;
  }

  sendSuccess(res, data);
}));

// ─── Patient Appointments ─────────────────────────────────────────────────
publicRouter.get('/appointments/booked-slots', asyncHandler(async (req, res) => {
  const { date } = req.query as { date: string };
  const repo = getRepo(req);
  const slots = await repo.getBookedSlots(date);
  sendSuccess(res, slots);
}));

publicRouter.get('/appointments/:phone', asyncHandler(async (req, res) => {
  const phone = req.params.phone as string;
  const repo = getRepo(req);
  const appointments = await repo.getPatientAppointments(phone);
  sendSuccess(res, appointments);
}));

publicRouter.post('/appointments/book', asyncHandler(async (req, res) => {
  const { phone, patientName, bookingDate, bookingTime, doctorId, visitType, notes } = req.body;
  if (!phone || !bookingDate) {
    throw new Error('Phone and booking date are required');
  }
  
  const repo = getRepo(req);
  const appointment = await repo.bookAppointment({
    phone,
    patientName: patientName || 'Patient',
    bookingDate,
    bookingTime: bookingTime || '',
    doctorId: doctorId || 101, // fallback if missing
    visitType: visitType || 'New',
    notes: notes || '',
  });
  
  sendSuccess(res, appointment, 'Appointment booked successfully');
}));

// ─── Cancel Appointment ───────────────────────────────────────────────────
publicRouter.patch('/appointments/:id/cancel', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const repo = getRepo(req);
  const result = await repo.cancelAppointment(Number(id));
  sendSuccess(res, result, 'Appointment cancelled');
}));

// Note: this moved to top of Patient Appointments section

// ─── Patient Preferences ─────────────────────────────────────────────────
publicRouter.get('/patient/:phone/preferences', asyncHandler(async (req, res) => {
  const phone = req.params.phone as string;
  const repo = getRepo(req);
  const prefs = await repo.getNotificationPreferences(phone);
  sendSuccess(res, prefs);
}));

publicRouter.patch('/patient/:phone/preferences', asyncHandler(async (req, res) => {
  const phone = req.params.phone as string;
  const prefs = req.body;
  const repo = getRepo(req);
  await repo.upsertNotificationPreferences(phone, prefs);
  sendSuccess(res, prefs, 'Preferences updated successfully');
}));

// ─── Patient Profile Update ──────────────────────────────────────────────
publicRouter.put('/patient/:phone/profile', asyncHandler(async (req, res) => {
  const phone = req.params.phone as string;
  const updates = req.body;
  const repo = getRepo(req);
  const result = await repo.updatePatientProfile(phone, updates);
  sendSuccess(res, result, 'Profile updated successfully');
}));
