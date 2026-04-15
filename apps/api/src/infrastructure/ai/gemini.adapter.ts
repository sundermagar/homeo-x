// ─── Gemini Adapter ───────────────────────────────────────────────────────────
// Implements AiProviderPort for Google Gemini models.
// Translated from Ai-Counsultaion NestJS provider to plain class.

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createLogger } from '../../shared/logger';
import type { AiProviderPort, AiCompletionRequest, AiCompletionResponse } from '../../domains/consultation/ports/ai-provider.port';

const logger = createLogger('gemini-adapter');

export class GeminiAdapter implements AiProviderPort {
  private genAIs: GoogleGenerativeAI[] = [];

  constructor(
    public readonly model: string,
    private readonly dailyLimit: number,
  ) {
    const rawKeys = process.env.GEMINI_API_KEY || '';
    const keys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);

    if (keys.length > 0) {
      this.genAIs = keys.map(key => new GoogleGenerativeAI(key));
      logger.info(`Gemini adapter ready: ${model} with ${keys.length} API key(s)`);
    }
  }

  get name() {
    return 'gemini';
  }

  async isAvailable(): Promise<boolean> {
    return this.genAIs.length > 0;
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    if (this.genAIs.length === 0) throw new Error('Gemini API keys not configured');

    let lastError: Error | null = null;
    const startIdx = Math.floor(Date.now() / 1000) % this.genAIs.length;

    for (let i = 0; i < this.genAIs.length; i++) {
      const currentIdx = (startIdx + i) % this.genAIs.length;
      const genAI = this.genAIs[currentIdx]!;

      try {
        const start = Date.now();
        const model = genAI.getGenerativeModel({
          model: this.model,
          generationConfig: {
            temperature: request.temperature ?? 0.3,
            maxOutputTokens: request.maxTokens ?? 2048,
            responseMimeType: request.responseFormat === 'json' ? 'application/json' : 'text/plain',
          },
          systemInstruction: request.systemPrompt,
        });

        const promptParts: any[] = [request.userPrompt || 'Extract information from these documents:'];
        if (request.documents && request.documents.length > 0) {
          for (const doc of request.documents) {
            promptParts.push({
              inlineData: {
                data: doc.base64,
                mimeType: doc.mimeType,
              },
            });
          }
        }

        const result = await model.generateContent(promptParts);
        const response = result.response;
        let content = response.text();

        if (request.responseFormat === 'json') {
          content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const startIndex = content.indexOf('{');
          const endIndex = content.lastIndexOf('}');
          if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            content = content.substring(startIndex, endIndex + 1);
          }
        }

        const latencyMs = Date.now() - start;
        const usage = response.usageMetadata;

        logger.info({
          provider: 'gemini',
          model: this.model,
          keyIndex: currentIdx,
          latencyMs,
          inputTokens: usage?.promptTokenCount,
          outputTokens: usage?.candidatesTokenCount,
        }, 'Gemini completion successful');

        return {
          content,
          provider: 'gemini',
          model: this.model,
          inputTokens: usage?.promptTokenCount,
          outputTokens: usage?.candidatesTokenCount,
          latencyMs,
        };
      } catch (error: any) {
        lastError = error;
        const errorMsg = (error.message || '').toLowerCase();

        if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('limit')) {
          logger.warn(`Gemini key ${currentIdx} rate limited for ${this.model}, trying next`);
          continue;
        }

        logger.error(`Gemini key ${currentIdx} failed: ${error.message}`);
      }
    }

    throw lastError || new Error(`All ${this.genAIs.length} Gemini keys failed for ${this.model}`);
  }
}
