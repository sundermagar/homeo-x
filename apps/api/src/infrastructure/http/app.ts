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
import { correlationIdMiddleware } from './middleware/correlation-id';
import { requestLogger } from './middleware/request-logger';
import { errorHandler } from './middleware/error-handler';
import { tenantMiddleware } from './middleware/tenant';
import { authMiddleware } from './middleware/auth';
import { auditMiddleware } from './middleware/audit';
import { appConfig } from '../../shared/config/app-config';
import { aiConfig } from '../../shared/config/ai-config';
import { createLogger } from '../../shared/logger';
import { healthRouter } from './routes/health';
// ─── Friend's modules ───
import { authRouter } from './routes/auth';
import { appointmentsRouter } from './routes/appointments';
import { medicalCasesRouter } from './routes/medical-cases';
import { doctorsRouter } from './routes/doctors';
import { packagesRouter } from './routes/packages';
import { communicationRouter } from './routes/communication';
import { analyticsRouter } from './routes/analytics';
import { dashboardRouter } from './routes/dashboard.router';
import { patientRouter } from './routes/patient.router'; // From shiva
import { createBillingRouter } from './routes/billing.router';
import { createPaymentRouter } from './routes/payment.router';
import { createAccountsRouter } from './routes/accounts.router';
import { createDayChargesRouter } from './routes/day-charges.router';
import { createDepositsRouter } from './routes/deposits.router';
import { createExpensesRouter } from './routes/expenses.router';
import { createOrganizationRouter } from './routes/organization.router';
import { createAccountRouter } from './routes/account.router';
import { createClinicAdminsRouter } from './routes/clinicadmins.router';
import { rolesRouter } from './routes/roles.router';
import { permissionsRouter } from './routes/permissions.router';
import { crmRouter } from './routes/crm.router';
import { logisticsRouter } from './routes/logistics.router';
import { knowledgeRouter } from './routes/knowledge.router';
import { recordsRouter } from './routes/records.router';
import { staffRouter } from './routes/staff.router';
import { createSettingsRouter } from './routes/settings.router';
import { exportRouter } from './routes/export.router';

const logger = createLogger('http');

import { createDbClient, TenantRegistry } from '@mmc/database';

export async function createApp(): Promise<{ app: Express; server: HttpServer; io: SocketIOServer; tenantDb: any }> {
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

  // ─── Operations & Logistics (JWT required) ───
  app.use('/api/crm', authMiddleware, crmRouter);
  app.use('/api/logistics', authMiddleware, logisticsRouter);
  app.use('/api/knowledge', authMiddleware, knowledgeRouter);
  app.use('/api/records', authMiddleware, recordsRouter);
  app.use('/api/staff', authMiddleware, staffRouter);

  // Roles & Permissions
  app.use('/api/roles', authMiddleware, rolesRouter);
  app.use('/api/permissions', authMiddleware, permissionsRouter);

  // Data Export
  app.use('/api/export', authMiddleware, exportRouter);

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
  // --- END AUTO BACKFILL ---

  logger.info('Express app configured with enterprise middleware stack');
  return { app, server, io, tenantDb };
}
