
// ─── Translator Engine ────────────────────────────────────────────────────────
// Translates Hindi/Hinglish text to English for the consultation pipeline.
// Primary path: Google Cloud Translation API (deterministic, purpose-built).
// Fallback: returns original text as-is (no LLM fallback to save credits).

import { createLogger } from '../../../shared/logger.js';
import type { AiProviderChain } from '../../../infrastructure/ai/ai-provider-chain.js';

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
        const credentialsStr = process.env.GOOGLE_CREDENTIALS_BASE64 
          ? Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf-8') 
          : null;
        const credentials = credentialsStr ? JSON.parse(credentialsStr) : undefined;

        return new TranslateCtor(credentials ? { credentials, projectId: credentials.project_id } : undefined);
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

    // ── 1. Skip logic: Is it pure English? ───────────────────────────────────
    // Use a simple heuristic: if mostly ASCII and no non-English words, assume English
    const isLikelyEnglish = /^[a-zA-Z0-9\s\.,!?;:'"()-]+$/.test(text) && !/\b(hai|mein|hain|nahi|aur|ko|se|par|ka|ki|ke|tha|thi|ho|hota|wala|accha|theek|bahut|et|und|der|die|das|le|la|les|el|los|las|che|il|lo|gli|la|le|i|o|a|gli|ne|na|ta|te|ho|hai|wa|ga|wo|ni|de|wa|mo|ru|shi|ri|ku|tsu|ka|ke|ko|sa|shi|su|se|so|ta|chi|tsu|te|to|na|ni|nu|ne|no|ha|hi|fu|he|ho|ma|mi|mu|me|mo|ya|yu|yo|ra|ri|ru|re|ro|wa|wo|n|ga|gi|gu|ge|go|za|ji|zu|ze|zo|da|di|du|de|do|ba|bi|bu|be|bo|pa|pi|pu|pe|po)\b/i.test(text);
    
    if (isLikelyEnglish) {
      return text;
    }

    // ── 2. Primary path: Google Cloud Translation ─────────────────────────────
    try {
      const translate = await getTranslateClient();
      if (translate) {
        const translateOptions: { to: string; format: string; from?: string } = {
          to: 'en',
          format: 'text',
        };
        // Let Google auto-detect the source language
        const [translated] = await translate.translate(text, translateOptions);
        const out = (Array.isArray(translated) ? translated[0] : translated || '').trim();
        if (out) return out;
      }
    } catch (err: any) {
      logger.warn({ err: err?.message }, 'Google Translate failed — returning original text');
    }

    // ── 3. Fallback: return original text (no LLM to save credits) ─────────────
    logger.warn('Google Translate unavailable — returning original text as-is');
    return text;
  }

  private isStrongHinglish(text: string): boolean {
    // Only trigger if we see actual Hindi grammar words (hai, mein, ka, ki, etc.)
    // Avoid common words that are used in English like 'doctor', 'patient', 'clinic'.
    const strongHinglish = /\b(hai|mein|hain|nahi|aur|ko|se|par|ka|ki|ke|tha|thi|ho|hota|wala|accha|theek|bahut|dard|bukhar|khasi|pet|sar|kamar|neend|chakkar|jalan|khujli|sujan|thand|garmi|bata|raha|rahi|abhi|pehle|baad|din|hamesha|kabhi|kbhi|thoda|zyada)\b/i;
    return strongHinglish.test(text);
  }
}
