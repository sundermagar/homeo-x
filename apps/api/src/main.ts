import './shared/config/load-env';
import type { Server } from 'node:http';
import { createApp } from './infrastructure/http/app';
import { createLogger } from './shared/logger';
import { appConfig } from './shared/config/app-config';
import { aiConfig } from './shared/config/ai-config';

const logger = createLogger('main');

async function listenWithFallback(
  server: Server,
  startPort: number,
  maxAttempts = 10
): Promise<number> {
  let port = startPort;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      await new Promise<void>((resolve, reject) => {
        const onError = (err: NodeJS.ErrnoException) => {
          server.off('listening', onListening);
          reject(err);
        };
        const onListening = () => {
          server.off('error', onError);
          resolve();
        };

        server.once('error', onError);
        server.once('listening', onListening);
        server.listen(port);
      });
      return port;
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code !== 'EADDRINUSE') throw e;
      logger.warn(`Port ${port} is busy, trying ${port + 1}`);
      port += 1;
    }
  }

  throw new Error(`No available port found from ${startPort} to ${startPort + maxAttempts - 1}`);
}

async function bootstrap() {
  // Log startup config (non-sensitive)
  logger.info(`Environment: ${appConfig.env}`);
  logger.info(`CORS origins: ${appConfig.cors.origins.join(', ')}`);
  logger.info(`AI health: ${JSON.stringify(aiConfig.getHealthStatus())}`);

  const { app, server } = await createApp();
  const boundPort = await listenWithFallback(server, appConfig.port);
  logger.info(`API server running on port ${boundPort}`);

  // ─── Global Process Error Handlers ───
  process.on('uncaughtException', (err) => {
    logger.fatal({ err, stack: err.stack }, 'UNCAUGHT EXCEPTION — shutting down');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'UNHANDLED REJECTION — logging and continuing');
    // Don't exit — log and continue. Exiting on promise rejections is too aggressive.
  });

  // ─── Graceful Shutdown ───
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    // Force exit after 10s
    setTimeout(() => {
      logger.error('Forced shutdown after 10s timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
