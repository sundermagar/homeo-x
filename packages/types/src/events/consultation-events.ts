export interface JoinConsultationPayload {
  visitId: string;
  speaker: 'DOCTOR' | 'PATIENT';
  displayName?: string;
}

export interface ParticipantEvent {
  speaker: 'DOCTOR' | 'PATIENT';
  displayName?: string;
}

export interface PauseStatePayload {
  visitId: string;
  isPaused: boolean;
  speaker: 'DOCTOR' | 'PATIENT';
}
