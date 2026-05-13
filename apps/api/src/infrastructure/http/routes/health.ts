import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { aiConfig } from '../../../shared/config/ai-config.js';
import { aiGeminiBreaker, aiGroqBreaker, deepgramBreaker } from '../../../shared/resilience/circuit-breaker.js';
import { sendSuccess } from '../../../shared/response-formatter.js';
import { sql } from 'drizzle-orm';

export const healthRouter: ExpressRouter = Router();

healthRouter.get('/', (_req, res) => {
  const aiHealth = aiConfig.getHealthStatus();
  const breakers = {
    gemini: aiGeminiBreaker.getState(),
    groq: aiGroqBreaker.getState(),
    deepgram: deepgramBreaker.getState(),
  };

  const allProvidersDown = !aiHealth.gemini?.available && !aiHealth.groq?.available;

  const payload = {
    status: allProvidersDown ? 'degraded' : 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    ai: aiHealth,
    circuitBreakers: breakers,
  };

  sendSuccess(res, payload, undefined, allProvidersDown ? 503 : 200);
});


// Debug routes removed for security compliance (DPDP Phase 1)


