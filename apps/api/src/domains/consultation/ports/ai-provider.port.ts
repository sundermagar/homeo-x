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
  preferredProvider?: string;
  tenantId?: string;
  userId?: string;
  userName?: string;
  /**
   * The AI feature category (e.g. 'Consultation', 'STT', 'Summarization', 'Prescription', 'WhatsApp', 'Email', 'SMS').
   * Used to dynamically load routing rules, fallback models, and token caps configured in the dashboard.
   */
  feature?: string;
  
  /**
   * Optional API key passed from the database for the specific tenant.
   * If provided, the adapter will use this key dynamically instead of falling back to system keys.
   */
  runtimeApiKey?: string;
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
