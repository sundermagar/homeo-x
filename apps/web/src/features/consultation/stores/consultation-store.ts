import { create } from 'zustand';
import type { ConsultationStage } from '@mmc/types';
import type { GnmAnalysis, EmotionProfile, ScoredRemedy, AiSuggestedQuestion } from '@mmc/types';

interface ConsultationState {
  // Stage
  stage: ConsultationStage;
  setStage: (stage: ConsultationStage) => void;

  // Transcript
  segments: Array<{ text: string; speaker: string; time: string; isAi?: boolean }>;
  addSegment: (segment: ConsultationState['segments'][0]) => void;
  clearSegments: () => void;

  // AI Analysis
  gnmData: GnmAnalysis | null;
  emotionProfile: EmotionProfile[];
  scoredRemedies: ScoredRemedy[];
  suggestedQuestions: AiSuggestedQuestion[];
  isAnalyzing: boolean;
  aiError: string | null;

  setAiResult: (data: {
    gnm?: GnmAnalysis | null;
    emotionProfile?: EmotionProfile[];
    scoredRemedies?: ScoredRemedy[];
    suggestedQuestions?: AiSuggestedQuestion[];
  }) => void;
  setAnalyzing: (v: boolean) => void;
  setAiError: (err: string | null) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  stage: 'CONSULTATION' as ConsultationStage,
  segments: [],
  gnmData: null,
  emotionProfile: [],
  scoredRemedies: [],
  suggestedQuestions: [],
  isAnalyzing: false,
  aiError: null,
};

export const useConsultationStore = create<ConsultationState>()((set) => ({
  ...initialState,
  setStage: (stage) => set({ stage }),
  addSegment: (segment) => set((s) => {
    // Dedup: skip if same text in last 3
    const recent = s.segments.slice(-3);
    if (recent.some((r) => r.text === segment.text)) return s;
    return { segments: [...s.segments, segment] };
  }),
  clearSegments: () => set({ segments: [] }),
  setAiResult: (data) => set((s) => ({
    gnmData: data.gnm ?? s.gnmData,
    emotionProfile: data.emotionProfile ?? s.emotionProfile,
    scoredRemedies: data.scoredRemedies ?? s.scoredRemedies,
    suggestedQuestions: data.suggestedQuestions ?? s.suggestedQuestions,
  })),
  setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setAiError: (aiError) => set({ aiError }),
  reset: () => set(initialState),
}));
