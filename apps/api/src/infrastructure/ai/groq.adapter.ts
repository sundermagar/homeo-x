// ─── Groq Adapter ─────────────────────────────────────────────────────────────
// Implements AiProviderPort for Groq (Llama, Mixtral).
// Translated from Ai-Counsultaion NestJS provider to plain class.

import { createLogger } from '../../shared/logger';
import type { AiProviderPort, AiCompletionRequest, AiCompletionResponse } from '../../domains/consultation/ports/ai-provider.port';

const logger = createLogger('groq-adapter');

import Groq from 'groq-sdk';

export class GroqAdapter implements AiProviderPort {
  private clients: any[] = [];

  constructor(
    public readonly model: string,
    private readonly dailyLimit: number,
  ) {
    const rawKeys = process.env.GROQ_API_KEY || '';
    const keys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);

    if (keys.length > 0) {
      this.clients = keys.map(apiKey => new Groq({ apiKey }));
      logger.info(`Groq adapter ready: ${model} with ${keys.length} API key(s)`);
    } else {
      logger.warn('GROQ_API_KEY not found in environment');
    }
  }

  get name() {
    return 'groq';
  }

  async isAvailable(): Promise<boolean> {
    return this.clients.length > 0;
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    if (this.clients.length === 0) throw new Error('Groq API keys not configured');

    let lastError: Error | null = null;
    const startIdx = Math.floor(Date.now() / 1000) % this.clients.length;

    for (let i = 0; i < this.clients.length; i++) {
      const currentIdx = (startIdx + i) % this.clients.length;
      const client = this.clients[currentIdx];

      try {
        const start = Date.now();
        const response = await client.chat.completions.create({
          model: this.model,
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.userPrompt },
          ],
          temperature: request.temperature ?? 0.3,
          max_tokens: request.maxTokens ?? 2048,
          response_format: request.responseFormat === 'json' ? { type: 'json_object' } : undefined,
        });

        let content = response.choices[0]?.message?.content || '';

        if (request.responseFormat === 'json') {
          content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const startIndex = content.indexOf('{');
          const endIndex = content.lastIndexOf('}');
          if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            content = content.substring(startIndex, endIndex + 1);
          }
        }

        const latencyMs = Date.now() - start;

        logger.info({
          provider: 'groq',
          model: this.model,
          keyIndex: currentIdx,
          latencyMs,
          inputTokens: response.usage?.prompt_tokens,
          outputTokens: response.usage?.completion_tokens,
        }, 'Groq completion successful');

        return {
          content,
          provider: 'groq',
          model: this.model,
          inputTokens: response.usage?.prompt_tokens,
          outputTokens: response.usage?.completion_tokens,
          latencyMs,
        };
      } catch (error: any) {
        lastError = error;
        const errorMsg = (error.message || '').toLowerCase();

        if (errorMsg.includes('429') || errorMsg.includes('limit') || errorMsg.includes('quota')) {
          logger.warn(`Groq key ${currentIdx} rate limited for ${this.model}, trying next`);
          continue;
        }

        logger.error(`Groq key ${currentIdx} failed: ${error.message}`);
      }
    }

    throw lastError || new Error(`All ${this.clients.length} Groq keys failed for ${this.model}`);
  }
}
