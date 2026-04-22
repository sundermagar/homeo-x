import { AiProvider, ChatMessage } from './ai-provider.interface';

export class StubProvider implements AiProvider {
  readonly name = 'stub';

  private getCannedText(messages: ChatMessage[]): string {
    const systemContent = messages.find(m => m.role === 'system')?.content;
    const contentStr = typeof systemContent === 'string' ? systemContent.toUpperCase() : '';
    
    if (contentStr.includes('GNM') || contentStr.includes('GERMAN NEW MEDICINE')) {
      return 'STUB: Territorial conflict pattern detected. Conflict-active phase. The symptoms suggest an ongoing biological conflict. Re-evaluate the patient\'s recent life events.';
    }
    if (contentStr.includes('RUBRICS')) {
      return 'STUB: Rubric perception — Delusion: body is enlarged or heavy. Recommended rubrics include Mind, Delusions, enlarged.';
    }
    if (contentStr.includes('CORRELATION')) {
      return 'STUB: Rubric-to-remedy correlation map — Sulphur / Lycopodium. High affinity based on the repertorization matrix.';
    }
    
    return 'STUB: Sulphur 30C — presenting picture matches sulphur state. Hot, untidy, philosophical, and prone to skin eruptions. Consider as an initial prescription.';
  }

  isAvailable(): boolean {
    return process.env.AI_STUB_MODE === 'true';
  }

  async analyze(messages: ChatMessage[], temperature?: number): Promise<string> {
    const text = this.getCannedText(messages);
    return new Promise(resolve => setTimeout(() => resolve(text), 5));
  }

  async *analyzeStream(messages: ChatMessage[]): AsyncGenerator<string> {
    const text = this.getCannedText(messages);
    
    let i = 0;
    while (i < text.length) {
      yield text.substring(i, i + 10);
      i += 10;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}
