import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { aiConfig } from '../../../shared/config/ai-config';
import { aiGeminiBreaker, aiGroqBreaker, deepgramBreaker } from '../../../shared/resilience/circuit-breaker';

export const healthRouter: ExpressRouter = Router();

healthRouter.get('/', (_req, res) => {
  const aiHealth = aiConfig.getHealthStatus();
  const breakers = {
    gemini: aiGeminiBreaker.getState(),
    groq: aiGroqBreaker.getState(),
    deepgram: deepgramBreaker.getState(),
  };

  const allProvidersDown = !aiHealth.gemini?.available && !aiHealth.groq?.available;

  res.status(allProvidersDown ? 503 : 200).json({
    success: !allProvidersDown,
    status: allProvidersDown ? 'degraded' : 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    ai: aiHealth,
    circuitBreakers: breakers,
  });
});
