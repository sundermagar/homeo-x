import { createLogger } from '../logger';

const logger = createLogger('app-config');

export interface AppConfig {
  env: string;
  port: number;
  appUrl: string;
  jwt: { secret: string; expiresIn: string };
  database: { url: string };
  redis: { url: string | null; upstashUrl: string | null; upstashToken: string | null };
  cors: { origins: string[] };
  rateLimit: { windowMs: number; max: number; authMax: number };
}

function loadConfig(): AppConfig {
  const config: AppConfig = {
    env: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT) || 3000,
    appUrl: process.env.APP_URL || 'http://localhost:3000',
    jwt: {
      secret: process.env.JWT_SECRET || '',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    },
    database: {
      url: process.env.DATABASE_URL || '',
    },
    redis: {
      url: process.env.REDIS_URL || null,
      upstashUrl: process.env.UPSTASH_REDIS_REST_URL || null,
      upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN || null,
    },
    cors: {
      origins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((s) => s.trim()),
    },
    rateLimit: {
      windowMs: 60_000,
      max: 200,
      authMax: 5,
    },
  };

  // Validate critical config
  const missing: string[] = [];
  if (!config.jwt.secret) missing.push('JWT_SECRET');
  if (!config.database.url) missing.push('DATABASE_URL');

  if (missing.length > 0) {
    logger.error(`CRITICAL: Missing required environment variables: ${missing.join(', ')}`);
    if (config.env === 'production') {
      throw new Error(`Missing required config: ${missing.join(', ')}`);
    }
  }

  return config;
}

export const appConfig = loadConfig();
