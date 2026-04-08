export interface TranscriptSegmentPayload {
  visitId: string;
  sessionId: string;
  segment: {
    sequenceNumber: number;
    text: string;
    speaker: 'DOCTOR' | 'PATIENT';
    confidence: number;
    startTimeMs: number;
    endTimeMs: number;
    isFinal: boolean;
    source?: 'WEB_SPEECH_API' | 'GROQ_WHISPER' | 'MANUAL';
    timestamp: number;
  };
}

export interface InterimTranscriptPayload {
  visitId: string;
  text: string;
  speaker: 'DOCTOR' | 'PATIENT';
}

export interface NewSegmentBroadcast {
  segment: TranscriptSegmentPayload['segment'];
  translatedText: string | null;
  visitId: string;
}
