import express from 'express';
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
// ─── Our modules (Billing & Platform) ───
import { createBillingRouter } from './routes/billing.router';
import { createPaymentRouter } from './routes/payment.router';
import { createOrganizationRouter } from './routes/organization.router';
import { createAccountRouter } from './routes/account.router';
import { createSettingsRouter } from './routes/settings.router';

const logger = createLogger('http');

export async function createApp(): Promise<{ app: Express; server: HttpServer; io: SocketIOServer }> {
  const app: Express = express();
  const server: HttpServer = createServer(app);

  // Socket.io
  const io: SocketIOServer = new SocketServer(server, {
    cors: { origin: appConfig.cors.origins, credentials: true },
  });

  // ─── Security ───
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false }));
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
  app.use(express.json({ limit: '10mb' }));

  // ─── Observability ───
  app.use(correlationIdMiddleware);
  app.use(requestLogger);

  // ─── Tenant Resolution ───
  app.use('/api', tenantMiddleware);

  // ─── Audit Trail ───
  app.use(auditMiddleware);

  // ─── Routes ───
  app.use('/api/health', healthRouter);

  // Friend's modules
  app.use('/api/auth', authRouter);
  app.use('/api/appointments', appointmentsRouter);
  app.use('/api/medical-cases', medicalCasesRouter);
  app.use('/api/doctors', doctorsRouter);
  app.use('/api/packages', packagesRouter);

  // Our modules — Billing & Finance
  app.use('/api/billing', createBillingRouter());
  app.use('/api/payments', createPaymentRouter());

  // Our modules — Platform (JWT required)
  app.use('/api/organizations', authMiddleware, createOrganizationRouter());
  app.use('/api/accounts',      authMiddleware, createAccountRouter());

  // Our modules — Settings & Configuration
  app.use('/api/settings', createSettingsRouter());

  // ─── Error Handling (must be last) ───
  app.use(errorHandler);

  logger.info('Express app configured with enterprise middleware stack');
  return { app, server, io };
}
