export type ScribingSessionStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'FAILED';
export type TranscriptSource = 'WEB_SPEECH_API' | 'GROQ_WHISPER' | 'MANUAL';
export type SpeakerLabel = 'DOCTOR' | 'PATIENT' | 'UNKNOWN';

export interface TranscriptSegment {
  id: string;
  sessionId: string;
  sequenceNumber: number;
  text: string;
  speaker: SpeakerLabel;
  confidence: number | null;
  startTimeMs: number;
  endTimeMs: number;
  isFinal: boolean;
  source: TranscriptSource;
  createdAt: string;
}

export interface ScribingSession {
  id: string;
  tenantId: string;
  visitId: string;
  userId: string;
  status: ScribingSessionStatus;
  language: string;
  totalDurationMs: number;
  startedAt: string;
  pausedAt: string | null;
  endedAt: string | null;
  metadata: Record<string, any> | null;
  segments: TranscriptSegment[];
}

export interface CreateSessionInput {
  visitId: string;
  language?: string;
}

export interface AddSegmentsInput {
  segments: Array<{
    sequenceNumber: number;
    text: string;
    speaker?: SpeakerLabel;
    confidence?: number;
    startTimeMs: number;
    endTimeMs: number;
    isFinal?: boolean;
    source?: TranscriptSource;
  }>;
}

export interface GenerateSoapFromTranscriptInput {
  chiefComplaint?: string;
  specialty?: string;
  patientAge?: number;
  patientGender?: string;
  allergies?: string[];
}

export interface UpdateSessionInput {
  metadata?: Record<string, any>;
  status?: ScribingSessionStatus;
  language?: string;
}

/** Local segment type used by useVoiceRecorder before backend persistence */
export interface TranscriptSegmentLocal {
  sequenceNumber: number;
  text: string;
  speaker: SpeakerLabel;
  confidence: number;
  startTimeMs: number;
  endTimeMs: number;
  isFinal: boolean;
  translatedText?: string;
  timestamp: number;
  source?: TranscriptSource;
}
