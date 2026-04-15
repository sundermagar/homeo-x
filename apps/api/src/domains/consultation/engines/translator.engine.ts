// ─── Translator Engine ────────────────────────────────────────────────────────
// Translates Hindi/Hinglish text to English for AI pipeline consumption.
// Ported from: Ai-Counsultaion/apps/api/src/modules/ai/engines/translator.engine.ts

import { createLogger } from '../../../shared/logger';
import type { AiProviderChain } from '../../../infrastructure/ai/ai-provider-chain';

const logger = createLogger('translator-engine');

export class TranslatorEngine {
  constructor(private providerChain: AiProviderChain) {}

  async translateToEnglish(tenantId: string, userId: string, text: string): Promise<string> {
    if (!text?.trim()) return '';

    // Skip if already English (simple heuristic)
    const nonAsciiRatio = (text.replace(/[\x00-\x7F]/g, '').length) / text.length;
    if (nonAsciiRatio < 0.1 && !this.looksLikeHinglish(text)) {
      return text;
    }

    try {
      const response = await this.providerChain.complete({
        systemPrompt: `You are a medical translator. Translate the following Hindi/Hinglish medical conversation text to English.
Rules:
- Preserve medical terminology accurately
- Keep proper nouns as-is
- If text is already in English, return it unchanged
- Provide natural, clinical English output
- Do NOT add any commentary or prefix like "Translation:"
- Return ONLY the translated text`,
        userPrompt: text,
        temperature: 0.1,
        maxTokens: 2048,
        responseFormat: 'text',
      });

      logger.info({ tenantId, inputLen: text.length, outputLen: response.content.length }, 'Translation complete');
      return response.content.trim();
    } catch (error: any) {
      logger.error({ error: error.message }, 'Translation failed, returning original text');
      return text;
    }
  }

  private looksLikeHinglish(text: string): boolean {
    const hinglishPatterns = /\b(kya|hai|mein|hain|nahi|aur|ko|se|par|ka|ki|ke|tha|thi|ho|hota|karke|wala|accha|theek|bahut|dard)\b/i;
    return hinglishPatterns.test(text);
  }
}
