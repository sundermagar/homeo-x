import 'dotenv/config';
import { createApp } from './infrastructure/http/app';
import { createLogger } from './shared/logger';

const logger = createLogger('main');
const port = Number(process.env.PORT) || 3000;

async function bootstrap() {
  const { app, server } = await createApp();

  server.listen(port, () => {
    logger.info(`API server running on port ${port}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down gracefully...');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
