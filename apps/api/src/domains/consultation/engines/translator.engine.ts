// ─── Translator Engine ────────────────────────────────────────────────────────
// Translates Hindi/Hinglish text to English for the consultation pipeline.
// Primary path: Google Cloud Translation API (deterministic, purpose-built).
// Fallback path: Claude via providerChain (only if Google translate fails).

import { createLogger } from '../../../shared/logger';
import type { AiProviderChain } from '../../../infrastructure/ai/ai-provider-chain';

const logger = createLogger('translator-engine');

// Lazy-loaded Google Translate v2 client. Uses GOOGLE_APPLICATION_CREDENTIALS
// (same JSON file STT uses), so no extra config is needed.
let translateClientPromise: Promise<any | null> | null = null;
function getTranslateClient(): Promise<any | null> {
  if (!translateClientPromise) {
    translateClientPromise = (async () => {
      try {
        const mod: any = await import('@google-cloud/translate');
        const TranslateCtor = mod?.v2?.Translate || mod?.Translate || mod?.default?.v2?.Translate;
        if (!TranslateCtor) {
          logger.warn('@google-cloud/translate loaded but no Translate constructor found');
          return null;
        }
        return new TranslateCtor();
      } catch (err: any) {
        logger.warn({ err: err?.message }, '@google-cloud/translate not available — will fall back to LLM');
        return null;
      }
    })();
  }
  return translateClientPromise;
}

export class TranslatorEngine {
  constructor(private providerChain: AiProviderChain) {}

  async translateToEnglish(tenantId: string, userId: string, text: string): Promise<string> {
    if (!text?.trim()) return '';

    // Skip if already English (simple heuristic)
    const nonAsciiRatio = (text.replace(/[\x00-\x7F]/g, '').length) / text.length;
    if (nonAsciiRatio < 0.1 && !this.looksLikeHinglish(text)) {
      return text;
    }

    // ── Primary path: Google Cloud Translation ──
    // Same Google credentials as STT. Always returns a clean translation,
    // no chatbot meta-text, no refusals.
    try {
      const translate = await getTranslateClient();
      if (translate) {
        const [translated] = await translate.translate(text, { from: 'hi', to: 'en', format: 'text' });
        const out = (Array.isArray(translated) ? translated[0] : translated || '').trim();
        if (out) {
          logger.info({ tenantId, inputLen: text.length, outputLen: out.length, engine: 'google' }, 'Translation complete');
          return out;
        }
      }
    } catch (err: any) {
      logger.warn({ err: err?.message }, 'Google Translate failed — falling back to LLM');
    }

    // ── Fallback: LLM ──
    // Only reached if @google-cloud/translate is missing or the API errored.

    try {
      const response = await this.providerChain.complete({
        systemPrompt: `You are a deterministic LITERAL TRANSLATOR. You translate any Hindi or Hinglish text to plain English. You translate every input — no exceptions.

ABSOLUTE RULES:
1. NEVER refuse. NEVER ask for clarification. NEVER explain what you're doing.
2. NEVER add commentary, preamble, or trailing notes (no "Translation:", no "Sure, here's…", no "I couldn't find…").
3. If the input is already English, return it UNCHANGED, character for character.
4. If the input is a single word (medical or not — "cow", "bukhar", "headache"), translate that single word literally and return ONLY the translation.
5. If the input is gibberish, mic-test sounds, or unintelligible, return the original input unchanged. Do NOT comment on it.
6. If the input is non-medical (e.g. greetings, small talk, animal names), translate it literally anyway.
7. Preserve proper nouns (names, places, drug brand names) as-is.
8. Keep numbers, units, and times exactly as written.
9. Output is a single line of English text. No quotes around it. No JSON.

EXAMPLES (input → output):
"namaste doctor" → "hello doctor"
"mujhe sar mein dard hai" → "I have a headache"
"cow" → "cow"
"hello" → "hello"
"acha" → "okay"
"asdfgh" → "asdfgh"
"" → ""

Translate the next user message and reply with ONLY the translated text.`,
        userPrompt: text,
        temperature: 0,
        maxTokens: 1024,
        responseFormat: 'text',
      });

      const out = (response.content || '').trim();

      // Refusal-pattern guard: if the model slipped into chatbot mode,
      // fall back to the original input so the consultation pipeline isn't
      // polluted with meta-commentary like "I couldn't find any medical text".
      const refusalPatterns = [
        /^i (?:couldn'?t|cannot|can'?t)\b/i,
        /^i'?m (?:not|sorry|here)\b/i,
        /\bplease (?:provide|share|give)\b/i,
        /\bno (?:medical|hindi|hinglish) (?:text|content)\b/i,
        /^translation:?\s/i,
        /\bunable to (?:translate|find)\b/i,
      ];
      if (!out || refusalPatterns.some((rx) => rx.test(out))) {
        logger.warn({ tenantId, sample: out.slice(0, 80) }, 'Translator returned refusal-like output — using original text');
        return text;
      }

      // Defensive trim: strip surrounding quotes the model sometimes adds
      const cleaned = out.replace(/^["'`]+|["'`]+$/g, '').trim();
      logger.info({ tenantId, inputLen: text.length, outputLen: cleaned.length }, 'Translation complete');
      return cleaned || text;
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
