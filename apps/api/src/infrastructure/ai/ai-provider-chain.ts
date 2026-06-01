// ─── AI Provider Chain ────────────────────────────────────────────────────────
// Multi-provider failover chain: Gemini → Groq
// Caches responses in-memory (Redis optional) for dedup.
// This is the single dependency that all AI engines receive.

import { createLogger } from '../../shared/logger.js';
import { OllamaAdapter } from './ollama.adapter.js';
import { GeminiAdapter } from './gemini.adapter.js';
import { GroqAdapter } from './groq.adapter.js';
import { AnthropicAdapter } from './anthropic.adapter.js';
import { createDbClient } from '@mmc/database';
import { aiRoutingRules, aiApiKeys } from '@mmc/database/schema';
import { eq, and, sql } from 'drizzle-orm';
import { ForbiddenError } from '../../shared/errors.js';
import { decryptApiKey } from './crypto.util.js';
import type {
  AiProviderPort,
  AiCompletionRequest,
  AiCompletionResponse,
} from '../../domains/consultation/ports/ai-provider.port.js';
import { logAiRequest } from './ai-request-logger.js';

const logger = createLogger('ai-provider-chain');

// Simple in-memory cache (LRU-style with max size)
const responseCache = new Map<string, { response: AiCompletionResponse; expiresAt: number }>();
const MAX_CACHE_SIZE = 200;

export class AiProviderChain {
  private providers: AiProviderPort[];

  constructor() {
    const defaultModel = process.env.AI_MODEL || 'claude-haiku-4-5';

    this.providers = [
      // Primary: Groq (Ultra-Fast, Stable, with Vision-capable Scout model first)
      new GroqAdapter('meta-llama/llama-4-scout-17b-16e-instruct', 1000),
      new GroqAdapter('llama-3.3-70b-versatile', 1000),
      new GroqAdapter('llama-3.1-8b-instant', 14400),

      // Fallback: Local Ollama
      new OllamaAdapter('qwen2.5:1.5b'),

      // Secondary: Anthropic Claude & Gemini (Scale/Quality)
      // NOTE: gemini-1.5-* models were retired by Google (404). Use current
      // multimodal models so the vision path (scanned PDFs / images) keeps working.
      new AnthropicAdapter(defaultModel, 1000),
      new GeminiAdapter('gemini-2.5-flash', 1500),
      new GeminiAdapter('gemini-2.5-flash-lite', 1500),
      new GeminiAdapter('gemini-flash-latest', 1500),
      new GeminiAdapter('gemini-2.0-flash', 1500),
    ];

    const available = this.providers.filter(p => {
      // Check synchronously by examining the adapter's internal state
      return (p as any).hasKey === true || (p as any).genAIs?.length > 0 || (p as any).clients?.length > 0 || p.name === 'ollama';
    });
    logger.info(`AI Provider Chain: ${available.length}/${this.providers.length} providers initialized`);
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const tenantId = request.tenantId || 'demo';
    
    // Normalize feature name for robust comparison
    let normalizedFeature = request.feature;
    if (normalizedFeature) {
      const lower = normalizedFeature.toLowerCase();
      if (lower === 'summarisation' || lower === 'summarization') {
        normalizedFeature = 'Summarization';
      } else if (lower === 'consultation') {
        normalizedFeature = 'Consultation';
      } else if (lower === 'stt' || lower === 'transcription') {
        normalizedFeature = 'STT';
      } else if (lower === 'prescription') {
        normalizedFeature = 'Prescription';
      } else if (lower === 'whatsapp') {
        normalizedFeature = 'WhatsApp';
      } else if (lower === 'email') {
        normalizedFeature = 'Email';
      } else if (lower === 'sms') {
        normalizedFeature = 'SMS';
      }
    }

    // ── Cache check ──
    if (request.useCache !== false) {
      const docHash = request.documents ? JSON.stringify(request.documents.map(d => d.base64.substring(0, 100))) : '';
      const cacheKey = this.hash(JSON.stringify({ s: request.systemPrompt, u: request.userPrompt, d: docHash }));
      const cached = responseCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        logger.info(`Cache hit for key ${cacheKey}`);
        return cached.response;
      }
    }

    const errors: string[] = [];

    // ── DB Routing Rules Lookup ──
    let rule: any = null;
    if (normalizedFeature) {
      try {
        const dbUrl = process.env.DATABASE_URL || process.env.VITE_API_URL;
        if (dbUrl) {
          const schemaName = tenantId.startsWith('tenant_') ? tenantId : `tenant_${tenantId}`;
          const db = createDbClient(dbUrl, schemaName);
          const dbQueryCondition = normalizedFeature === 'STT' 
            ? sql`lower(${aiRoutingRules.feature}) IN ('stt', 'transcription')`
            : normalizedFeature === 'Summarization'
            ? sql`lower(${aiRoutingRules.feature}) IN ('summarization', 'summarisation')`
            : eq(sql`lower(${aiRoutingRules.feature})`, normalizedFeature.toLowerCase());

          const rules = await db.select().from(aiRoutingRules)
            .where(
              and(
                eq(aiRoutingRules.tenantId, tenantId),
                dbQueryCondition
              )
            );
          if (rules && rules.length > 0) {
            rule = rules[0];
          }
        }
      } catch (dbError) {
        logger.error({ err: dbError }, 'Failed to query routing rules from database');
      }
    }

    // Enforce dynamic rule settings
    if (rule) {
      if (!rule.isEnabled) {
        throw new ForbiddenError(`AI Feature '${normalizedFeature}' is currently disabled by your clinic administrator.`);
      }
      if (rule.maxTokensPerCall) {
        request.maxTokens = rule.maxTokensPerCall;
      }
    }

    // ── Filter and fallback resolution ──
    let activeProviders = this.providers;
    if (rule) {
      const primaryModel = rule.primaryModelId;
      const fallbackModels = rule.fallbackModelId ? rule.fallbackModelId.split(',') : [];

      const primaryProvider = this.providers.find(p => p.model === primaryModel);
      const fallbackProviders = fallbackModels
        .map((id: string) => this.providers.find(p => p.model === id))
        .filter(Boolean);

      if (primaryProvider) {
        activeProviders = [primaryProvider];
        if (fallbackProviders.length > 0) {
          activeProviders.push(...fallbackProviders);
        }
        logger.info(`Routing rules applied for ${normalizedFeature}: primary=${primaryModel}, fallbacks=${fallbackModels.join(', ')}`);
      } else {
        logger.warn(`Primary model '${primaryModel}' configured in routing rules is not available in providers registry.`);
      }
    } else if (request.preferredProvider) {
      activeProviders = this.providers.filter(p => p.name.toLowerCase() === request.preferredProvider?.toLowerCase());
    }

    const startTime = Date.now();
    let isFallback = false;

    // ── Failover chain ──
    for (const provider of activeProviders) {
      const available = await provider.isAvailable();
      if (!available) {
        logger.warn(`Provider ${provider.name}/${provider.model} unavailable, skipping`);
        errors.push(`${provider.name}/${provider.model}: Not available/Keys missing`);
        continue;
      }

      if (request.documents && request.documents.length > 0) {
        if (provider.name === 'ollama' || (provider.name === 'groq' && !provider.model.includes('vision') && !provider.model.includes('scout'))) {
          logger.warn(`Provider ${provider.name}/${provider.model} does not support image documents, skipping`);
          errors.push(`${provider.name}/${provider.model}: Skipped (does not support images)`);
          continue;
        }
      }

      try {
        // Dynamic DB lookup for tenant's API key
        if (request.tenantId) {
          const dbUrl = process.env.DATABASE_URL || process.env.VITE_API_URL || '';
          const schemaName = request.tenantId.startsWith('tenant_') ? request.tenantId : `tenant_${request.tenantId}`;
          const db = createDbClient(dbUrl, schemaName);
          const [keyRow] = await db.select({ encryptedKey: aiApiKeys.encryptedKey })
            .from(aiApiKeys)
            .where(
              and(
                eq(aiApiKeys.tenantId, request.tenantId),
                eq(aiApiKeys.provider, provider.name.toLowerCase()),
                eq(aiApiKeys.status, 'active')
              )
            );
          
          if (keyRow?.encryptedKey) {
            try {
              request.runtimeApiKey = decryptApiKey(keyRow.encryptedKey);
            } catch (err: any) {
              logger.warn(`Failed to decrypt API key for tenant ${request.tenantId}, provider ${provider.name}`);
            }
          }
        }

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

        // Auto-log to DB (fire-and-forget, don't block the response)
        logAiRequest({
          tenantId: request.tenantId || 'demo',
          userId: request.userId || 'system',
          userName: request.userName || 'System',
          feature: request.feature || 'unknown',
          modelId: provider.model,
          providerId: provider.name,
          isFallback,
          inputTokens: response.inputTokens || 0,
          outputTokens: response.outputTokens || 0,
          promptText: request.userPrompt,
          responseText: response.content,
          latencyMs: Date.now() - startTime,
          status: 'SUCCESS',
        });

        return response;
      } catch (error: any) {
        logger.error({ err: error, errMsg: error.message }, `Provider ${provider.name}/${provider.model} failed`);
        errors.push(`${provider.name}/${provider.model}: ${error.message}`);
        isFallback = true;
        continue;
      }
    }

    throw new Error(`All AI providers exhausted. Details: ${errors.join(' | ')}`);
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

export function reloadAiProviderChain(): void {
  _instance = new AiProviderChain();
  logger.info('AI Provider Chain has been live-reloaded with new environment variables');
}
