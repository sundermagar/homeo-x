// ─── Anthropic Provider Adapter ─────────────────────────────────────────────
// Implements AiProviderPort for Anthropic Claude.

import Anthropic from '@anthropic-ai/sdk';
import { createLogger } from '../../shared/logger';
import type {
  AiProviderPort,
  AiCompletionRequest,
  AiCompletionResponse,
} from '../../domains/consultation/ports/ai-provider.port';

const logger = createLogger('anthropic-adapter');

export class AnthropicAdapter implements AiProviderPort {
  readonly name = 'Anthropic';
  readonly model: string;
  readonly quotaCallsPerMinute: number;
  private reqCount: number = 0;
  private lastResetTime: number = Date.now();
  private client: Anthropic | null = null;
  private hasKey: boolean = false;

  constructor(modelName: string, quota: number) {
    this.model = modelName;
    this.quotaCallsPerMinute = quota;
    this.init();
  }

  private init() {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      this.hasKey = false;
      return;
    }
    try {
      this.client = new Anthropic({ apiKey: key });
      this.hasKey = true;
    } catch (err: any) {
      logger.error(`Failed to init Anthropic: ${err.message}`);
      this.hasKey = false;
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.hasKey || !this.client) return false;

    // Reset quota counter every minute
    const now = Date.now();
    if (now - this.lastResetTime > 60_000) {
      this.reqCount = 0;
      this.lastResetTime = now;
    }

    return this.reqCount < this.quotaCallsPerMinute;
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    if (!this.client || !this.hasKey) {
      throw new Error('Anthropic provider is not properly initialized or missing API key');
    }

    this.reqCount++;
    const t0 = performance.now();

    try {
      // Provide JSON enforced system prompts
      let systemPrompt = request.systemPrompt || '';
      if (request.responseFormat === 'json') {
        systemPrompt = `${systemPrompt}\n\nIMPORTANT: You must return ONLY valid, raw JSON. Do not use markdown blocks like \`\`\`json. Return just the JSON structure.`;
      }

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: request.maxTokens || 4000,
        temperature: request.temperature || 0.7,
        system: systemPrompt,
        messages: [{ role: 'user', content: request.userPrompt }],
      });

      // Assert content is text
      const contentBlock = response.content[0];
      if (!contentBlock || contentBlock.type !== 'text') {
        throw new Error('Received non-text output from Anthropic');
      }

      let textOutput = contentBlock.text;
      
      // Post-process to ensure JSON validity if requested
      if (request.responseFormat === 'json') {
        textOutput = textOutput.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      }

      const latencyMs = performance.now() - t0;
      return {
        content: textOutput,
        latencyMs,
        provider: this.name,
        model: this.model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      };

    } catch (err: any) {
      logger.error(`Anthropic ${this.model} error: ${err.message}`);
      if (err?.status === 429) {
        // Force quota exhaustion so next call fails isAvailable() fast.
        this.reqCount = this.quotaCallsPerMinute;
      }
      throw err;
    }
  }
}
