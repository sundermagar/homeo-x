// ─── AI Provider Port Interface ───────────────────────────────────────────────
// Hexagonal Architecture: This is the PORT that domain engines depend on.
// Adapters (Gemini, Groq) implement this interface.

export interface AiCompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  documents?: { base64: string; mimeType: string }[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json' | 'text';
  useCache?: boolean;
}

export interface AiCompletionResponse {
  content: string;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
}

export interface AiProviderPort {
  readonly name: string;
  readonly model: string;
  isAvailable(): Promise<boolean>;
  complete(request: AiCompletionRequest): Promise<AiCompletionResponse>;
}
