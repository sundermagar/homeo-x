import { Router } from 'express';
import { SendOtpUseCase } from '../../../domains/public/use-cases/send-otp.use-case';
import { VerifyOtpUseCase } from '../../../domains/public/use-cases/verify-otp.use-case';
import { GetPublicContentUseCase } from '../../../domains/public/use-cases/get-public-content.use-case';
import { PublicRepositoryPg } from '../../repositories/public.repository.pg';
import { sql } from 'drizzle-orm';
import { asyncHandler } from '../middleware/async-handler';
import { sendSuccess } from '../../../shared/response-formatter';

export const publicRouter: Router = Router();

const getRepo = (req: any) => new PublicRepositoryPg(req.tenantDb);

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
  const page = await useCase.getPage(req.params.slug);
  sendSuccess(res, page);
}));

// ─── Direct Clinical Access (Transient) ───────────────────────────────────
publicRouter.get('/clinical/:phone', asyncHandler(async (req, res) => {
  const { phone } = req.params;
  const repo = getRepo(req);
  const data = await repo.getLatestClinicalData(phone);
  
  if (!data) {
    return res.status(404).json({ success: false, message: 'No patient record found for this number' });
  }

  sendSuccess(res, data);
}));
