import { createLogger } from '../logger';

const logger = createLogger('ai-config');

export interface AiProviderConfig {
  name: string;
  type: 'gemini' | 'groq' | 'azure';
  keys: string[];
  models: string[];
  isAvailable: boolean;
  rateLimit: { maxPerMinute: number; currentUsage: number };
}

export interface AiConfig {
  providers: AiProviderConfig[];
  transcription: { deepgramKey: string | null; isAvailable: boolean };
  videoCall: { livekitUrl: string | null; livekitApiKey: string | null; livekitApiSecret: string | null; isAvailable: boolean };
}

/**
 * Centralized AI configuration manager.
 * Validates keys on startup, exposes health status, supports hot-reload.
 */
class AiConfigService {
  private config: AiConfig;
  private static instance: AiConfigService | null = null;

  private constructor() {
    this.config = this.loadFromEnv();
    this.validateOnStartup();
  }

  static getInstance(): AiConfigService {
    if (!AiConfigService.instance) {
      AiConfigService.instance = new AiConfigService();
    }
    return AiConfigService.instance;
  }

  private parseKeys(envValue: string | undefined): string[] {
    if (!envValue) return [];
    return envValue.split(',').map((k) => k.trim()).filter(Boolean);
  }

  private loadFromEnv(): AiConfig {
    const geminiKeys = this.parseKeys(process.env.GEMINI_API_KEY);
    const groqKeys = this.parseKeys(process.env.GROQ_API_KEY);
    const azureKey = process.env.AI_API_KEY ? [process.env.AI_API_KEY] : [];

    return {
      providers: [
        {
          name: 'Google Gemini',
          type: 'gemini',
          keys: geminiKeys,
          models: ['gemini-2.0-flash', 'gemini-1.5-flash'],
          isAvailable: geminiKeys.length > 0,
          rateLimit: { maxPerMinute: 15 * geminiKeys.length, currentUsage: 0 },
        },
        {
          name: 'Groq',
          type: 'groq',
          keys: groqKeys,
          models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
          isAvailable: groqKeys.length > 0,
          rateLimit: { maxPerMinute: 30 * groqKeys.length, currentUsage: 0 },
        },
        {
          name: 'Azure OpenAI',
          type: 'azure',
          keys: azureKey,
          models: [process.env.AI_DEPLOYMENT || 'gpt-4o-mini'],
          isAvailable: azureKey.length > 0 && !!process.env.AI_ENDPOINT,
          rateLimit: { maxPerMinute: 60, currentUsage: 0 },
        },
      ],
      transcription: {
        deepgramKey: process.env.DEEPGRAM_API_KEY || null,
        isAvailable: !!process.env.DEEPGRAM_API_KEY,
      },
      videoCall: {
        livekitUrl: process.env.LIVEKIT_URL || null,
        livekitApiKey: process.env.LIVEKIT_API_KEY || null,
        livekitApiSecret: process.env.LIVEKIT_API_SECRET || null,
        isAvailable: !!process.env.LIVEKIT_URL && !!process.env.LIVEKIT_API_KEY,
      },
    };
  }

  private validateOnStartup(): void {
    const available = this.config.providers.filter((p) => p.isAvailable);
    const totalKeys = available.reduce((sum, p) => sum + p.keys.length, 0);

    if (available.length === 0) {
      logger.error('NO AI PROVIDERS CONFIGURED. Set GEMINI_API_KEY or GROQ_API_KEY in .env');
    } else {
      logger.info(`AI providers ready: ${available.map((p) => `${p.name} (${p.keys.length} keys)`).join(', ')}`);
    }

    if (!this.config.transcription.isAvailable) {
      logger.warn('Deepgram not configured — cloud transcription unavailable (Web Speech API still works)');
    }

    if (!this.config.videoCall.isAvailable) {
      logger.warn('LiveKit not configured — video calls unavailable');
    }

    logger.info(`Total AI keys loaded: ${totalKeys}`);
  }

  getProviders(): AiProviderConfig[] {
    return this.config.providers;
  }

  getAvailableProviders(): AiProviderConfig[] {
    return this.config.providers.filter((p) => p.isAvailable);
  }

  getProvider(type: 'gemini' | 'groq' | 'azure'): AiProviderConfig | undefined {
    return this.config.providers.find((p) => p.type === type && p.isAvailable);
  }

  getTranscriptionConfig() {
    return this.config.transcription;
  }

  getVideoCallConfig() {
    return this.config.videoCall;
  }

  /** Health check summary for /api/health endpoint */
  getHealthStatus(): Record<string, { available: boolean; keyCount: number; models: string[] }> {
    const status: Record<string, { available: boolean; keyCount: number; models: string[] }> = {};
    for (const p of this.config.providers) {
      status[p.type] = { available: p.isAvailable, keyCount: p.keys.length, models: p.models };
    }
    status['deepgram'] = { available: this.config.transcription.isAvailable, keyCount: this.config.transcription.deepgramKey ? 1 : 0, models: ['nova-3-medical'] };
    status['livekit'] = { available: this.config.videoCall.isAvailable, keyCount: this.config.videoCall.livekitApiKey ? 1 : 0, models: [] };
    return status;
  }

  /** Reload configuration from env (supports hot-reload without restart) */
  reload(): void {
    this.config = this.loadFromEnv();
    this.validateOnStartup();
    logger.info('AI configuration reloaded');
  }
}

export const aiConfig = AiConfigService.getInstance();
