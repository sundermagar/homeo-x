import express from 'express';
import path from 'path';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import type { Express } from 'express';
import type { Server as HttpServer } from 'node:http';
import type { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { correlationIdMiddleware } from './middleware/correlation-id.js';
import { requestLogger } from './middleware/request-logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { tenantMiddleware } from './middleware/tenant.js';
import { authMiddleware } from './middleware/auth.js';
import { auditMiddleware } from './middleware/audit.js';
import { appConfig } from '../../shared/config/app-config.js';
import { aiConfig } from '../../shared/config/ai-config.js';
import { createLogger } from '../../shared/logger.js';
import { healthRouter } from './routes/health.js';
// ─── Friend's modules ───
import { authRouter } from './routes/auth.js';
import { appointmentsRouter } from './routes/appointments.js';
import { medicalCasesRouter } from './routes/medical-cases.js';
import { doctorsRouter } from './routes/doctors.js';
import { packagesRouter } from './routes/packages.js';
import { communicationRouter } from './routes/communication.js';
import { analyticsRouter } from './routes/analytics.js';
import { dashboardRouter } from './routes/dashboard.router.js';
import { patientRouter } from './routes/patient.router.js'; // From shiva
import { createBillingRouter } from './routes/billing.router.js';
import { createPaymentRouter } from './routes/payment.router.js';
import { createAccountsRouter } from './routes/accounts.router.js';
import { createDayChargesRouter } from './routes/day-charges.router.js';
import { createDepositsRouter } from './routes/deposits.router.js';
import { createExpensesRouter } from './routes/expenses.router.js';
import { createOrganizationRouter } from './routes/organization.router.js';
import { createAccountRouter } from './routes/account.router.js';
import { createClinicAdminsRouter } from './routes/clinicadmins.router.js';
import { rolesRouter } from './routes/roles.router.js';
import { permissionsRouter } from './routes/permissions.router.js';
import { crmRouter } from './routes/crm.router.js';
import { logisticsRouter } from './routes/logistics.router.js';
import { knowledgeRouter } from './routes/knowledge.router.js';
import { recordsRouter } from './routes/records.router.js';
import { staffRouter } from './routes/staff.router.js';
import { createSettingsRouter } from './routes/settings.router.js';
import { exportRouter } from './routes/export.router.js';
import { consultationsRouter } from './routes/consultations.router.js';
import { aiRouter } from './routes/ai.router.js';
import { scribingRouter } from './routes/scribing.router.js';
import { visitsRouter } from './routes/visits.router.js';
import { videoCallRouter } from './routes/video-call.router.js';
import { specialtiesRouter } from './routes/specialties.router.js';
import { setupTranscriptionGateway } from './gateways/transcription.gateway.js';
import { setupVideoCallGateway } from './gateways/video-call.gateway.js';
import { TranslatorEngine } from '../../domains/consultation/engines/translator.engine.js';
import { getAiProviderChain } from '../ai/ai-provider-chain.js';
import { createTerminologyRouter } from './routes/terminology.router.js';
import { createNotificationsRouter } from './routes/notifications.router.js';
import { setupNotificationsGateway, setNotificationEmitters } from './gateways/notifications.gateway.js';

const logger = createLogger('http');

import { createDbClient, TenantRegistry } from '@mmc/database';

export async function createApp(): Promise<{ app: Express; server: HttpServer; io: SocketIOServer; tenantDb: any; publicDb: any }> {
  const app: Express = express();
  const server: HttpServer = createServer(app);

  // Socket.io
  const io: SocketIOServer = new SocketServer(server, {
    cors: { origin: appConfig.cors.origins, credentials: true },
  });

  // ─── Security ───
  app.set('trust proxy', 1);
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  }));
  app.use(cors({ origin: appConfig.cors.origins, credentials: true }));

  // ─── Rate Limiting ───
  app.use('/api/', rateLimit({
    windowMs: appConfig.rateLimit.windowMs,
    max: appConfig.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests', code: 'RATE_LIMITED' },
  }));

  app.use('/api/auth/login', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: appConfig.rateLimit.authMax,
    message: { success: false, error: 'Too many login attempts', code: 'RATE_LIMITED' },
  }));

  // ─── Request Processing ───
  app.use(compression());
  app.use(express.json({ limit: '50mb' }));
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // ─── Observability ───
  app.use(correlationIdMiddleware);
  app.use(requestLogger);

  // ─── Tenant Resolution ───
  app.use('/api', tenantMiddleware);

  // ─── Audit Trail ───
  app.use(auditMiddleware);

  // ─── Real-time Updates (Socket.io) ───
  app.use((req, res, next) => {
    (req as any).io = io;
    next();
  });

  // ─── Routes ───
  app.use('/api/health', healthRouter);

  // Friend's modules
  app.use('/api/auth', authRouter);
  app.use('/api/appointments', appointmentsRouter);
  app.use('/api/medical-cases', medicalCasesRouter);
  app.use('/api/doctors', doctorsRouter);
  app.use('/api/packages', packagesRouter);
  app.use('/api/communications', communicationRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/patients', patientRouter); // Added patient from shiva

  // Our modules — Billing & Finance
  app.use('/api/billing', createBillingRouter());
  app.use('/api/payments', createPaymentRouter());
  app.use('/api/accounts', createAccountsRouter());
  app.use('/api/day-charges', createDayChargesRouter());
  app.use('/api/deposits', createDepositsRouter());
  app.use('/api/expenses', createExpensesRouter());

  // Our modules — Platform (JWT required)
  app.use('/api/organizations', authMiddleware, createOrganizationRouter());
  app.use('/api/platform-accounts', authMiddleware, createAccountRouter());
  // Temporary unauthenticated route for backfilling
  app.use('/api/public-clinicadmins', createClinicAdminsRouter());
  app.use('/api/clinicadmins', authMiddleware, createClinicAdminsRouter());
  
  // Our modules — Settings & Configuration
  app.use('/api/settings', authMiddleware, createSettingsRouter());
  
  // Clinical Terminology
  app.use('/api/terminology', createTerminologyRouter());

  // ─── Operations & Logistics (JWT required) ───
  app.use('/api/crm', authMiddleware, crmRouter);
  app.use('/api/logistics', authMiddleware, logisticsRouter);
  app.use('/api/knowledge', authMiddleware, knowledgeRouter);
  app.use('/api/records', authMiddleware, recordsRouter);
  app.use('/api/staff', authMiddleware, staffRouter);
  app.use('/api/notifications', authMiddleware, createNotificationsRouter());

  // Roles & Permissions
  app.use('/api/roles', authMiddleware, rolesRouter);
  app.use('/api/permissions', authMiddleware, permissionsRouter);

  // Data Export
  app.use('/api/export', authMiddleware, exportRouter);

  // ─── Consultation, Scribing, AI, Visits (JWT required) ───
  app.use('/api/consultations', authMiddleware, consultationsRouter);
  app.use('/api/scribing', authMiddleware, scribingRouter);
  app.use('/api/ai', authMiddleware, aiRouter);
  app.use('/api/visits', authMiddleware, visitsRouter);
  app.use('/api/specialties', authMiddleware, specialtiesRouter);

  // ─── Video Call (LiveKit token issuance) ───
  // Mounted without authMiddleware because the patient-join link must be
  // accessible without a doctor's JWT. The doctor `/token` endpoint reads
  // req.user.id when present and falls back to 'system' otherwise.
  app.use('/api/video-call', videoCallRouter);

  // ─── Real-time transcription gateway (Socket.IO /transcription namespace) ───
  // Web clients send PCM audio chunks; the gateway streams them to Google STT
  // and broadcasts transcripts back. The translator engine renders Hindi → English.
  try {
    const translator = new TranslatorEngine(getAiProviderChain());
    setupTranscriptionGateway(io, translator);
  } catch (err: any) {
    logger.error({ err: err?.message }, 'Failed to initialize transcription gateway');
  }

  // ─── Video Call signalling gateway (Socket.IO /video-call namespace) ───
  // Relays doctor questions and call-leave events to the patient's browser tab.
  try {
    setupVideoCallGateway(io);
  } catch (err: any) {
    logger.error({ err: err?.message }, 'Failed to initialize video-call gateway');
  }

  // ─── Notifications gateway (Socket.IO /notifications namespace) ───
  // Pushes real-time notifications to authenticated users.
  try {
    const { emitToUser, emitToClinic } = setupNotificationsGateway(io);
    setNotificationEmitters(emitToUser, emitToClinic);
    logger.info('Notifications gateway initialized on /notifications namespace');
  } catch (err: any) {
    logger.error({ err: err?.message }, 'Failed to initialize notifications gateway');
  }

  // ─── Error Handling (must be last) ───
  app.use(errorHandler);

  // Initialize TenantRegistry from database to ensure persistence
  const publicDb = createDbClient(process.env.DATABASE_URL!);

  if (typeof (TenantRegistry as any).initialize === 'function') {
    logger.info('Initializing TenantRegistry from database...');
    await (TenantRegistry as any).initialize(publicDb);
  }



  // For background jobs and system tasks, we provide a default tenant DB (demo)
  const defaultTenant = TenantRegistry.resolve('demo') || { schemaName: 'public' };
  const tenantDb = createDbClient(process.env.DATABASE_URL!, (defaultTenant as any).schemaName);

  // --- ONE-TIME AUTO BACKFILL OF MISSING CLINIC ADMINS ---
  logger.info('Express app configured with enterprise middleware stack');

  // Ensure performance indexes on first startup (fire-and-forget, non-blocking)
  ensureIndexes(publicDb).catch(err => logger.warn({ err }, 'Index creation skipped'));
  if (tenantDb) ensureIndexes(tenantDb).catch(err => logger.warn({ err }, 'Tenant index creation skipped'));

  return { app, server, io, tenantDb, publicDb };
}

/**
 * Creates performance indexes on all core tables.
 * Safe to re-run — indexes will be created only if they don't exist.
 * This improves dashboard, patient, and doctor query performance.
 */
async function ensureIndexes(db: any): Promise<void> {
  const { sql } = await import('drizzle-orm');

  // Ensure case_reminders table exists (Added for Clinical Activity feature)
  try {
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS "case_reminders" (
        "id" serial PRIMARY KEY NOT NULL,
        "regid" integer NOT NULL,
        "reminder_date" timestamp,
        "message" text,
        "status" varchar(20) DEFAULT 'Pending',
        "created_at" timestamp DEFAULT now()
      );
    `));
    
    // Ensure regid column exists in vitals (from Migration 0014)
    await db.execute(sql.raw(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vitals' AND column_name = 'regid') THEN
          ALTER TABLE vitals ADD COLUMN regid INTEGER;
        END IF;
      END $$;
    `));

    // Ensure regid column exists in soap_notes (from Migration 0014)
    await db.execute(sql.raw(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'soap_notes' AND column_name = 'regid') THEN
          ALTER TABLE soap_notes ADD COLUMN regid INTEGER;
        END IF;
      END $$;
    `));

    // Ensure notifications table exists
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL,
        "clinic_id" integer,
        "type" varchar(50) NOT NULL,
        "title" text NOT NULL,
        "message" text NOT NULL,
        "is_read" boolean DEFAULT false NOT NULL,
        "deleted_at" timestamp,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `));
  } catch (err: any) {
    logger.debug({ err: err.message }, 'Failed to ensure case_reminders table');
  }

  const indexes: string[] = [
    `CREATE INDEX IF NOT EXISTS idx_patients_clinic_deleted ON patients (clinic_id) WHERE deleted_at IS NULL OR deleted_at::text = ''`,
    `CREATE INDEX IF NOT EXISTS idx_patients_deleted ON patients (id) WHERE deleted_at IS NULL OR deleted_at::text = ''`,
    // ── Dashboard-critical composite indexes ──────────────────────────────────
    // appointments: used in KPI counts + revenue series (clinic_id + booking_date filter)
    `CREATE INDEX IF NOT EXISTS idx_appts_clinic_date ON appointments (clinic_id, booking_date) WHERE deleted_at IS NULL OR deleted_at::text = ''`,
    `CREATE INDEX IF NOT EXISTS idx_appts_clinic_date_type ON appointments (clinic_id, booking_date) WHERE deleted_at IS NULL OR deleted_at::text = ''`,
    // patients: used in KPI (clinic_id + created_at range)
    `CREATE INDEX IF NOT EXISTS idx_patients_clinic_created ON patients (clinic_id, created_at) WHERE deleted_at IS NULL OR deleted_at::text = ''`,
    // bills: used in KPI + revenue breakdown + top billing (clinic_id + bill_date)
    `CREATE INDEX IF NOT EXISTS idx_bills_clinic_date ON bills (clinic_id, bill_date) WHERE deleted_at IS NULL OR deleted_at::text = ''`,
    `CREATE INDEX IF NOT EXISTS idx_bills_clinic_date_amt ON bills (clinic_id, bill_date, charges DESC) WHERE deleted_at IS NULL OR deleted_at::text = ''`,
    // waitlist: used in queue + KPI wait time (clinic_id + date)
    `CREATE INDEX IF NOT EXISTS idx_waitlist_clinic_date ON waitlist (clinic_id, date) WHERE deleted_at IS NULL OR deleted_at::text = ''`,
    `CREATE INDEX IF NOT EXISTS idx_waitlist_clinic_date_called ON waitlist (clinic_id, date) WHERE called_at IS NOT NULL AND checked_in_at IS NOT NULL AND (deleted_at IS NULL OR deleted_at::text = '')`,
    // receipt: used in KPI financials + revenue series (clinic_id join via patients)
    `CREATE INDEX IF NOT EXISTS idx_receipt_regid ON receipt (regid) WHERE deleted_at IS NULL OR deleted_at::text = ''`,
    // doctors + users: used in staff-on-duty (clinic_id filter)
    `CREATE INDEX IF NOT EXISTS idx_doctors_clinic ON doctors (clinic_id) WHERE deleted_at IS NULL OR deleted_at::text = ''`,
    `CREATE INDEX IF NOT EXISTS idx_users_context_active ON users (context_id) WHERE deleted_at IS NULL OR deleted_at::text = ''`,
    // ── Legacy / admin ────────────────────────────────────────────────────────
    `CREATE INDEX IF NOT EXISTS idx_appts_clinic ON appointments (clinic_id) WHERE deleted_at IS NULL OR deleted_at::text = ''`,
    `CREATE INDEX IF NOT EXISTS idx_appts_date ON appointments (booking_date) WHERE deleted_at IS NULL OR deleted_at::text = ''`,
    `CREATE INDEX IF NOT EXISTS idx_appts_doctor_clinic ON appointments (doctor_id, clinic_id) WHERE deleted_at IS NULL OR deleted_at::text = ''`,
    `CREATE INDEX IF NOT EXISTS idx_receipt_created ON receipt (created_at) WHERE deleted_at IS NULL OR deleted_at::text = ''`,
    `CREATE INDEX IF NOT EXISTS idx_users_email_active ON users (email) WHERE deleted_at IS NULL OR deleted_at::text = ''`,
    `CREATE INDEX IF NOT EXISTS idx_users_type ON users (type) WHERE deleted_at IS NULL OR deleted_at::text = ''`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (exp_date) WHERE deleted_at IS NULL OR deleted_at::text = ''`,
    `CREATE INDEX IF NOT EXISTS idx_case_reminders_clinic_status ON case_reminder (clinic_id, status) WHERE status = 'pending'`,
  ];

  for (const idxSql of indexes) {
    try {
      await db.execute(sql.raw(idxSql));
    } catch (err: any) {
      if (!err.message?.includes('already exists')) {
        logger.debug({ err: err.message }, `Index: ${idxSql.substring(0, 50)}`);
      }
    }
  }
  logger.info(`Indexes ensured (${indexes.length} checked)`);
}

/**
 * Background task to ensure all clinics have their default administrator account
 * mirrored in the public schema for authentication.
 */
export async function runAdminBackfill(publicDb: any) {
  try {
    const { sql } = await import('drizzle-orm');
    const bcrypt = await import('bcryptjs');
    logger.info('Running auto-backfill for clinic admins...');

    const orgs = await publicDb.execute(sql`
      SELECT id, name, admin_email, admin_password
      FROM organizations
      WHERE admin_email IS NOT NULL AND admin_email != ''
        AND admin_password IS NOT NULL AND admin_password != ''
        AND deleted_at IS NULL
    `) as any[];

    let createdCount = 0;
    for (const org of orgs) {
      const email = org.admin_email;
      const existing = await publicDb.execute(
        sql`SELECT id FROM users WHERE LOWER(email) = LOWER(${email}) AND (deleted_at IS NULL OR deleted_at::text = '') LIMIT 1`
      ) as any[];

      if (!existing || existing.length === 0) {
        const hashedPassword = org.admin_password.startsWith('$2') ? org.admin_password : await bcrypt.hash(org.admin_password, 10);
        const adminName = `${org.name} Admin`;
        const userResult = await publicDb.execute(sql`
          INSERT INTO users (name, email, password, type, context_id, created_at, updated_at)
          VALUES (${adminName}, ${email}, ${hashedPassword}, 'Clinicadmin', ${org.id}, NOW(), NOW())
          RETURNING id
        `) as any[];
        const userId = userResult[0]?.id;
        if (userId) {
          await publicDb.execute(sql`
            INSERT INTO clinicadmins (id, name, email, password, mobile, gender, designation, dept, salary_cur, clinic_id, created_at, updated_at)
            VALUES (${userId}, ${adminName}, ${email}, ${hashedPassword}, '', 'Male', 'Clinic Administrator', 1, 0, ${org.id}, NOW(), NOW())
          `);
          await publicDb.execute(sql`
            INSERT INTO role_user (id, user_id, role_id, created_at)
            VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM role_user), ${userId}, 2, NOW())
            ON CONFLICT (id) DO NOTHING
          `);
          createdCount++;
          logger.info({ email }, '✅ Backfilled missing clinic admin');
        }
      }
    }
    logger.info(`Auto-backfill complete. Created ${createdCount} missing admins.`);
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed auto-backfill');
  }
}
