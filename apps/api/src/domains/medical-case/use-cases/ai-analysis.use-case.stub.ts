import { AnalysisTheory, AIAnalysisParams } from './ai-analysis.use-case';

const CANNED: Record<AnalysisTheory, string> = {
  [AnalysisTheory.HOMEOPATHY]: 'STUB: Sulphur 30C — presenting picture matches sulphur state...',
  [AnalysisTheory.GNM]: 'STUB: Territorial conflict pattern detected. Conflict-active phase...',
  [AnalysisTheory.RUBRICS]: 'STUB: Rubric perception — Delusion: body is enlarged or heavy...',
  [AnalysisTheory.CORRELATION]: 'STUB: Rubric-to-remedy correlation map — Sulphur / Lycopodium...',
  [AnalysisTheory.REPORT]: 'STUB: Medical report indicates elevated markers consistent with chronic inflammation...'
};

export const aiAnalysisStub = {
  execute: async (params: AIAnalysisParams) => ({
    analysis: CANNED[params.theory] ?? CANNED[AnalysisTheory.HOMEOPATHY],
    sessionId: 'stub-session-000',
    provider: 'stub' as const,
  }),
};
