import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { correlationIdMiddleware } from './middleware/correlation-id';
import { requestLogger } from './middleware/request-logger';
import { errorHandler } from './middleware/error-handler';
import { tenantMiddleware } from './middleware/tenant';
import { auditMiddleware } from './middleware/audit';
import { appConfig } from '../../shared/config/app-config';
import { aiConfig } from '../../shared/config/ai-config';
import { createLogger } from '../../shared/logger';
import { healthRouter } from './routes/health';

const logger = createLogger('http');

export async function createApp() {
  const app = express();
  const server = createServer(app);

  // Socket.io
  const io = new SocketServer(server, {
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

  // TODO: Register domain routers here as migration progresses

  // ─── Error Handling (must be last) ───
  app.use(errorHandler);

  logger.info('Express app configured with enterprise middleware stack');
  return { app, server, io };
}
