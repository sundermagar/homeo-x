export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | any[];
}

export interface AiProvider {
  readonly name: 'gemini' | 'groq' | 'stub';
  isAvailable(): boolean;
  analyze(messages: ChatMessage[], temperature?: number): Promise<string>;
  analyzeStream(messages: ChatMessage[]): AsyncGenerator<string>;
}
