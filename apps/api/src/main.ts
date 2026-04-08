import 'dotenv/config';
import { createApp } from './infrastructure/http/app';
import { createLogger } from './shared/logger';
import { appConfig } from './shared/config/app-config';
import { aiConfig } from './shared/config/ai-config';

const logger = createLogger('main');

async function bootstrap() {
  // Log startup config (non-sensitive)
  logger.info(`Environment: ${appConfig.env}`);
  logger.info(`CORS origins: ${appConfig.cors.origins.join(', ')}`);
  logger.info(`AI health: ${JSON.stringify(aiConfig.getHealthStatus())}`);

  const { app, server } = await createApp();

  server.listen(appConfig.port, () => {
    logger.info(`API server running on port ${appConfig.port}`);
  });

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
