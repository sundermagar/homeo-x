// ─── AI Provider Chain ────────────────────────────────────────────────────────
// Multi-provider failover chain: Gemini → Groq
// Caches responses in-memory (Redis optional) for dedup.
// This is the single dependency that all AI engines receive.

import { createLogger } from '../../shared/logger';
import { GeminiAdapter } from './gemini.adapter';
import { GroqAdapter } from './groq.adapter';
import { AnthropicAdapter } from './anthropic.adapter';
import type {
  AiProviderPort,
  AiCompletionRequest,
  AiCompletionResponse,
} from '../../domains/consultation/ports/ai-provider.port';

const logger = createLogger('ai-provider-chain');

// Simple in-memory cache (LRU-style with max size)
const responseCache = new Map<string, { response: AiCompletionResponse; expiresAt: number }>();
const MAX_CACHE_SIZE = 200;

export class AiProviderChain {
  private providers: AiProviderPort[];

  constructor() {
    const defaultModel = process.env.AIMODEL || 'claude-3-haiku-20240307';
    
    this.providers = [
      // Primary: Anthropic Claude (Premium Quality)
      new AnthropicAdapter(defaultModel, 1000),

      // Secondary: Groq (Verified Working, Ultra Fast Fallback)
      new GroqAdapter('llama-3.3-70b-versatile', 1000),
      new GroqAdapter('llama-3.1-8b-instant', 14400),

      // Tertiary: Gemini (Scalable Fallback)
      new GeminiAdapter('gemini-1.5-flash', 1500),
      new GeminiAdapter('gemini-2.0-flash', 1500),
      new GeminiAdapter('gemini-1.5-flash-8b', 2000),
    ];

    const available = this.providers.filter(p => {
      // Check synchronously by examining the adapter's internal state
      return (p as any).hasKey === true || (p as any).genAIs?.length > 0 || (p as any).clients?.length > 0;
    });
    logger.info(`AI Provider Chain: ${available.length}/${this.providers.length} providers initialized`);
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    // ── Cache check ──
    if (request.useCache !== false) {
      const cacheKey = this.hash(JSON.stringify({ s: request.systemPrompt, u: request.userPrompt }));
      const cached = responseCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        logger.info(`Cache hit for key ${cacheKey}`);
        return cached.response;
      }
    }

    // ── Failover chain ──
    for (const provider of this.providers) {
      const available = await provider.isAvailable();
      if (!available) {
        logger.warn(`Provider ${provider.name}/${provider.model} unavailable, skipping`);
        continue;
      }

      try {
        const response = await provider.complete(request);

        // Cache successful response (1 hour TTL)
        if (request.useCache !== false) {
          const cacheKey = this.hash(JSON.stringify({ s: request.systemPrompt, u: request.userPrompt }));
          responseCache.set(cacheKey, { response, expiresAt: Date.now() + 3600_000 });
          // Evict oldest if over limit
          if (responseCache.size > MAX_CACHE_SIZE) {
            const firstKey = responseCache.keys().next().value;
            if (firstKey) responseCache.delete(firstKey);
          }
        }

        return response;
      } catch (error: any) {
        logger.error({ err: error, errMsg: error.message }, `Provider ${provider.name}/${provider.model} failed`);
        continue;
      }
    }

    throw new Error('All AI providers exhausted or rate limited. Check server logs for exact API errors (401 invalid key, 429 quota, etc).');
  }

  getProviders(): AiProviderPort[] {
    return this.providers;
  }

  private hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }
}

// Singleton instance — all engines share this
let _instance: AiProviderChain | null = null;

export function getAiProviderChain(): AiProviderChain {
  if (!_instance) {
    _instance = new AiProviderChain();
  }
  return _instance;
}
