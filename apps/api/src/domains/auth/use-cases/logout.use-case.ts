import type { AuthTokenPayload } from '@mmc/types';
import { redisService } from '../../../infrastructure/cache/redis.js';
import { type Result, ok } from '../../../shared/result.js';

export class LogoutUseCase {
  async execute(token: string, payload: AuthTokenPayload & { exp?: number }): Promise<Result<void>> {
    if (redisService.isConnected()) {
      const nowSec = Math.floor(Date.now() / 1000);
      const ttl = payload.exp ? Math.max(payload.exp - nowSec, 1) : 86400;

      await redisService.set(`blacklist:${token}`, '1', ttl);
    }
    return ok(undefined);
  }
}
