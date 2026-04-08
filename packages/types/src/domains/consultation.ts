import type { ConsultationStage, ScribingStatus, Speaker, ThermalReaction, Miasm } from '../enums';

export interface ScribingSession {
  id: number;
  tenantId: string;
  visitId: string;
  userId: number | null;
  status: ScribingStatus;
  language: string;
  totalDurationMs: number;
  metadata: Record<string, unknown> | null;
  startedAt: Date;
  endedAt: Date | null;
}

export interface TranscriptSegment {
  id: number;
  sessionId: number;
  sequenceNumber: number;
  text: string;
  speaker: Speaker;
  confidence: number;
  startTimeMs: number;
  endTimeMs: number;
  isFinal: boolean;
  source: 'WEB_SPEECH_API' | 'GROQ_WHISPER' | 'MANUAL';
  createdAt: Date;
}

export interface GnmAnalysis {
  dhs: string;
  tissue: string;
  biologicalConflict: string;
  phase: string;
  active: string[];
  healing: string[];
  rails: string;
  resolution: string;
}

export interface EmotionProfile {
  label: string;
  val: number;
}

export interface ClinicalExtraction {
  observations: string[];
  chiefComplaints: string[];
  generals: {
    thirst: string;
    appetite: string;
    sleep: string;
    thermalPreference: string;
    perspiration: string;
    energy: string;
  };
  modalities: {
    amelioration: string[];
    aggravation: string[];
  };
  mentalState: string[];
  clinicalFindings: string[];
  redFlags: string[];
  provisionalDiagnosis: {
    name: string;
    icdCode: string;
    reasoning: string;
  };
  gnm: GnmAnalysis;
  emotionProfile: EmotionProfile[];
  nextQuestions: AiSuggestedQuestion[];
  confidence: number;
}

export interface AiSuggestedQuestion {
  text: string;
  tag: string;
  rationale: string;
}

export interface ScoredRemedy {
  remedyName: string;
  totalScore: number;
  coverage: string[];
}

export interface ConsultationPipelineResult {
  clinicalData: ClinicalExtraction;
  gnm: GnmAnalysis | null;
  miasmProfile: { dominant: string; secondary: string | null; reasoning: string } | null;
  emotionProfile: EmotionProfile[];
  nextQuestions: AiSuggestedQuestion[];
  repertory: {
    rubrics: Array<{ rubricId?: string; description: string; category: string; importance: string }>;
    remedies: ScoredRemedy[];
  };
  prescription: Record<string, unknown>;
  soap: Record<string, unknown>;
  narrativeSummary: string;
}
