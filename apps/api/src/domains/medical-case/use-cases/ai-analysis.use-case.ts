import { llmFacade } from '../../../infrastructure/ai/llm.facade';
import { ChatMessage } from '../../../infrastructure/ai/ai-provider.interface';
import * as crypto from 'crypto';

export enum AnalysisTheory {
  HOMEOPATHY = 'HOMEOPATHY',
  GNM = 'GNM',
  RUBRICS = 'RUBRICS',
  CORRELATION = 'CORRELATION',
  REPORT = 'REPORT'
}

export interface AIAnalysisParams {
  theory: AnalysisTheory;
  question: string;
  imageUrl?: string;
  patientContext?: string;
  regid?: number;
  userId?: number;
  sessionId?: string;
  stream?: boolean;
}

const PROMPT_TEMPLATES: Record<AnalysisTheory, string> = {
  [AnalysisTheory.HOMEOPATHY]: 'Give like Homeopathic expert in chart form that include indication and dosage',
  [AnalysisTheory.GNM]: 'Can you make me understand cause according to German new medicine',
  [AnalysisTheory.RUBRICS]: 'What can be the possible rubrics of perception as expressed as Delusion of as per Homeopathy',
  [AnalysisTheory.CORRELATION]: 'map this perception–rubric correlation to specific remedy groups',
  [AnalysisTheory.REPORT]: 'Examine this medical report and provide a comprehensive analysis through a homeopathic lens.'
};

export class AIAnalysisUseCase {
  private async enrichWithPatientContext(db: any, regid?: number): Promise<string> {
    if (!regid) return '';
    try {
      // Stub implementation: queries soap_notes, vitals, case_notes
      return `Patient ID ${regid} historical context placeholder`;
    } catch {
      return '';
    }
  }

  private async persistSession(db: any, sessionId: string, userId?: number, regid?: number, theory?: string, messages?: ChatMessage[]): Promise<void> {
    if (!db || !userId || !regid) return;
    try {
      // Upsert ai_analysis_sessions placeholder
    } catch (error) {
      console.warn('Failed to persist session:', error);
    }
  }

  private async buildMessages(params: AIAnalysisParams, db: any): Promise<ChatMessage[]> {
    const systemPrompt = PROMPT_TEMPLATES[params.theory] || PROMPT_TEMPLATES[AnalysisTheory.HOMEOPATHY];
    const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt }];

    const extraContext = await this.enrichWithPatientContext(db, params.regid);
    const fullContext = [params.patientContext, extraContext].filter(Boolean).join('\n\n');

    if (params.imageUrl) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: fullContext ? `Context: ${fullContext}\nSymptom: ${params.question}` : params.question },
          { type: 'image_url', image_url: { url: params.imageUrl } }
        ]
      });
    } else {
      const userText = fullContext 
        ? `Patient History: ${fullContext}\nCurrent Concern: ${params.question}`
        : params.question;
        
      messages.push({
        role: 'user',
        content: userText
      });
    }
    return messages;
  }

  async execute(params: AIAnalysisParams, db?: any): Promise<{ analysis: string; sessionId: string; provider: string }> {
    const messages = await this.buildMessages(params, db);
    const result = await llmFacade.analyze({ messages, temperature: 0.5 });
    
    const sessionId = params.sessionId || crypto.randomUUID();
    await this.persistSession(db, sessionId, params.userId, params.regid, params.theory, messages);

    return {
      analysis: result.text,
      sessionId,
      provider: result.provider
    };
  }

  async *stream(params: AIAnalysisParams, db?: any): AsyncGenerator<{ chunk: string; provider: string }> {
    const messages = await this.buildMessages(params, db);
    const sessionId = params.sessionId || crypto.randomUUID();
    
    await this.persistSession(db, sessionId, params.userId, params.regid, params.theory, messages);

    const stream = llmFacade.analyzeStream({ messages, temperature: 0.5 });
    for await (const chunk of stream) {
      yield chunk;
    }
  }
}

export const aiAnalysisUseCase = new AIAnalysisUseCase();
