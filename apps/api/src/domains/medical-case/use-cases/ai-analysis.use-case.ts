import { llmService, ChatMessage } from '../../../infrastructure/ai/llm.service';

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
}

const PROMPT_TEMPLATES: Record<AnalysisTheory, string> = {
  [AnalysisTheory.HOMEOPATHY]: 'Give like Homeopathic expert in chart form that include indication and dosage',
  [AnalysisTheory.GNM]: 'Can you make me understand cause according to German new medicine',
  [AnalysisTheory.RUBRICS]: 'What can be the possible rubrics of perception as expressed as Delusion of as per Homeopathy',
  [AnalysisTheory.CORRELATION]: 'map this perception–rubric correlation to specific remedy groups',
  [AnalysisTheory.REPORT]: 'Examine this medical report and provide a comprehensive analysis through a homeopathic lens.'
};

export class AIAnalysisUseCase {
  async execute(params: AIAnalysisParams): Promise<string> {
    const systemPrompt = PROMPT_TEMPLATES[params.theory] || PROMPT_TEMPLATES[AnalysisTheory.HOMEOPATHY];
    const roleAssistant = "Hello, how can I help?";

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'assistant', content: roleAssistant }
    ];

    if (params.imageUrl) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: params.patientContext ? `Context: ${params.patientContext}\nSymptom: ${params.question}` : params.question },
          { type: 'image_url', image_url: { url: params.imageUrl } }
        ]
      });
    } else {
      const userText = params.patientContext 
        ? `Patient History: ${params.patientContext}\nCurrent Concern: ${params.question}`
        : params.question;
        
      messages.push({
        role: 'user',
        content: userText
      });
    }

    return await llmService.analyze({ messages });
  }
}

export const aiAnalysisUseCase = new AIAnalysisUseCase();
