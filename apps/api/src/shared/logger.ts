import pino from 'pino';

const baseLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

export function createLogger(context: string) {
  return baseLogger.child({ context });
}

export type Logger = ReturnType<typeof createLogger>;
