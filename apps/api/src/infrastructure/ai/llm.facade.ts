import { AiProvider, ChatMessage } from './ai-provider.interface.js';
import { GeminiProvider } from './gemini.provider.js';
import { StubProvider } from './stub.provider.js';

export interface AIAnalysisRequestParams {
  messages: ChatMessage[];
  temperature?: number;
}

export class LLMFacade {
  private readonly chain: AiProvider[];

  constructor() {
    const isStubMode = process.env.AI_STUB_MODE === 'true';
    
    if (isStubMode) {
      this.chain = [new StubProvider()];
    } else {
      this.chain = [
        new GeminiProvider(),
        new StubProvider(),
      ];
    }
  }

  async analyze(req: AIAnalysisRequestParams): Promise<{ text: string; provider: string }> {
    for (const provider of this.chain) {
      if (!provider.isAvailable()) continue;
      try {
        const text = await provider.analyze(req.messages, req.temperature);
        return { text, provider: provider.name };
      } catch (err) {
        console.warn(`[LLMFacade] Provider ${provider.name} failed:`, err);
        // try next
      }
    }
    throw new Error('All AI providers unavailable');
  }

  async *analyzeStream(req: AIAnalysisRequestParams): AsyncGenerator<{ chunk: string; provider: string }> {
    for (const provider of this.chain) {
      if (!provider.isAvailable()) continue;
      try {
        for await (const chunk of provider.analyzeStream(req.messages)) {
          yield { chunk, provider: provider.name };
        }
        return;
      } catch (err) {
        console.warn(`[LLMFacade] Provider stream ${provider.name} failed:`, err);
        // try next
      }
    }
    yield { chunk: 'AI service temporarily unavailable.', provider: 'stub' };
  }
}

export const llmFacade = new LLMFacade();
