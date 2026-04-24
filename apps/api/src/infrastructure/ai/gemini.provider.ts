import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiProvider, ChatMessage } from './ai-provider.interface';

export class GeminiProvider implements AiProvider {
  readonly name = 'gemini';

  private get geminiKey() {
    return process.env.GEMINI_API_KEY || '';
  }

  isAvailable(): boolean {
    return !!this.geminiKey;
  }

  async analyze(messages: ChatMessage[], temperature?: number): Promise<string> {
    try {
      if (!this.geminiKey) {
        throw new Error("GEMINI_API_KEY is not configured in the environment.");
      }

      const genAI = new GoogleGenerativeAI(this.geminiKey);
      const systemMessage = messages.find(m => m.role === 'system')?.content as string | undefined;
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        ...(systemMessage && { systemInstruction: systemMessage })
      });

      const history: any[] = [];
      for (const msg of messages) {
        if (msg.role === 'system') continue;
        const role = msg.role === 'assistant' ? 'model' : 'user';
        if (Array.isArray(msg.content)) {
          const parts: any[] = [];
          for (const part of msg.content) {
             if (part.type === 'text') {
               parts.push({ text: part.text });
             } else if (part.type === 'image_url' && part.image_url?.url) {
               const match = part.image_url.url.match(/^data:(.+?);base64,(.+)$/);
               if (match) {
                 parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
               }
             }
          }
          if (parts.length > 0) history.push({ role, parts });
        } else {
           history.push({ role, parts: [{ text: msg.content }] });
        }
      }

      const promptParts = history.pop()?.parts ?? [];
      if (promptParts.length === 0) throw new Error('No valid prompt content found in messages.');
      
      const chatOptions: any = { generationConfig: { temperature: temperature ?? 0.5 } };
      if (history.length > 0) chatOptions.history = history;

      const chat = model.startChat(chatOptions);
      const result = await chat.sendMessage(promptParts);
      return result.response.text() || 'No analysis response generated.';
    } catch (error: any) {
      console.error('Gemini LLM Analysis Error:', error.message);
      throw new Error(`AI service failure: ${error.message}`);
    }
  }

  async *analyzeStream(messages: ChatMessage[]): AsyncGenerator<string> {
    try {
      if (!this.geminiKey) {
        throw new Error("GEMINI_API_KEY is not configured in the environment.");
      }

      const genAI = new GoogleGenerativeAI(this.geminiKey);
      const systemMessage = messages.find(m => m.role === 'system')?.content as string | undefined;
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        ...(systemMessage && { systemInstruction: systemMessage })
      });

      const history: any[] = [];
      for (const msg of messages) {
        if (msg.role === 'system') continue;
        const role = msg.role === 'assistant' ? 'model' : 'user';
        if (Array.isArray(msg.content)) {
          const parts: any[] = [];
          for (const part of msg.content) {
             if (part.type === 'text') {
               parts.push({ text: part.text });
             } else if (part.type === 'image_url' && part.image_url?.url) {
               const match = part.image_url.url.match(/^data:(.+?);base64,(.+)$/);
               if (match) {
                 parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
               }
             }
          }
          if (parts.length > 0) history.push({ role, parts });
        } else {
           history.push({ role, parts: [{ text: msg.content }] });
        }
      }

      const promptParts = history.pop()?.parts ?? [];
      if (promptParts.length === 0) throw new Error('No valid prompt content found in messages.');
      
      const chatOptions: any = { generationConfig: { temperature: 0.5 } };
      if (history.length > 0) chatOptions.history = history;

      const chat = model.startChat(chatOptions);
      const resultStream = await chat.sendMessageStream(promptParts);
      
      for await (const chunk of resultStream.stream) {
        yield chunk.text();
      }
    } catch (error: any) {
      console.error('Gemini LLM Stream Error:', error.message);
      throw new Error(`AI service failure: ${error.message}`);
    }
  }
}
