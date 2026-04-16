export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | any[];
}

export interface AIAnalysisRequest {
  messages: ChatMessage[];
  temperature?: number;
}

export class LLMService {
  private readonly groqEndpoint = 'https://api.groq.com/openai/v1/chat/completions';

  private get groqKey() {
    return process.env.GROQ_API_KEY || 'gskWFgUSoT30xp220bD1pCqWGdyb3FYXP4hHiJDkKP9r4WmqviXdc7K';
  }

  async analyze(request: AIAnalysisRequest): Promise<string> {
    try {
      const isVision = request.messages.some(m => Array.isArray(m.content));
      const model = isVision ? 'llama-3.2-90b-vision-preview' : 'llama-3.1-70b-versatile';

      const response = await fetch(this.groqEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.groqKey}`,
        },
        body: JSON.stringify({
          model,
          messages: request.messages,
          temperature: request.temperature ?? 0.5,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json() as any;
      return data.choices[0]?.message?.content ?? 'No analysis response generated.';
    } catch (error: any) {
      console.error('Groq LLM Analysis Error:', error.message);
      throw new Error(`AI service failure: ${error.message}`);
    }
  }
}

export const llmService = new LLMService();
