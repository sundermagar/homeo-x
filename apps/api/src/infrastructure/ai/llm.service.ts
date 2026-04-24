import { llmFacade, AIAnalysisRequestParams } from './llm.facade';
import { ChatMessage } from './ai-provider.interface';

// Keep the old interfaces exported for backward compatibility
export type { ChatMessage };
export type AIAnalysisRequest = AIAnalysisRequestParams;

export class LLMService {
  async analyze(request: AIAnalysisRequest): Promise<string> {
    const res = await llmFacade.analyze(request);
    return res.text;
  }
}

export const llmService = new LLMService();
