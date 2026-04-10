import Redis from 'ioredis';
import { appConfig } from '../../shared/config/app-config';
import { createLogger } from '../../shared/logger';

const logger = createLogger('redis');

class RedisService {
  private client: Redis | null = null;

  constructor() {
    if (appConfig.redis.url) {
      this.client = new Redis(appConfig.redis.url);
      
      this.client.on('connect', () => logger.info('Redis connected'));
      this.client.on('error', (err: Error) => logger.error({ err }, 'Redis error'));
    } else {
      logger.warn('Redis URL not configured. Cache/Blacklist features will be disabled.');
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    return this.client.get(key);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;
    const result = await this.client.exists(key);
    return result === 1;
  }

  async delete(key: string): Promise<void> {
    if (!this.client) return;
    await this.client.del(key);
  }

  isConnected(): boolean {
    return this.client !== null && this.client.status === 'ready';
  }
}

export const redisService = new RedisService();
