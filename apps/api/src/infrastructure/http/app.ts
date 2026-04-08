import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { tenantMiddleware } from './middleware/tenant';
import { createLogger } from '../../shared/logger';
import { healthRouter } from './routes/health';

const logger = createLogger('http');

export async function createApp() {
  const app = express();
  const server = createServer(app);

  // Socket.io
  const io = new SocketServer(server, {
    cors: {
      origin: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(','),
      credentials: true,
    },
  });

  // Global middleware
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({
    origin: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(','),
    credentials: true,
  }));
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(requestLogger);

  // Tenant resolution (attaches db client to req)
  app.use('/api', tenantMiddleware);

  // Routes
  app.use('/api/health', healthRouter);

  // TODO: Register domain routers here as migration progresses
  // app.use('/api/auth', authRouter);
  // app.use('/api/patients', patientRouter);
  // ...

  // Error handling (must be last)
  app.use(errorHandler);

  logger.info('Express app configured');
  return { app, server, io };
}
