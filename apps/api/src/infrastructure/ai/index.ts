// AI Engine adapters — each engine implements a port interface
// Migrated from: server/src/modules/ai/engines/

export { GeminiAdapter } from './gemini.adapter';
export { GroqAdapter } from './groq.adapter';
export { AnthropicAdapter } from './anthropic.adapter';
export { AiProviderChain, getAiProviderChain } from './ai-provider-chain';
export type { AiProviderPort, AiCompletionRequest, AiCompletionResponse } from '../../domains/consultation/ports/ai-provider.port';
