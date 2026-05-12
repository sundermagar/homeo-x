export interface SOAPNote {
  id: string;
  visitId: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  advice?: string;
  followUp?: string;
  clinicalSummary?: string;
  icdCodes: string[];
  aiGenerated: boolean;
  aiConfidence?: number;
  doctorApproved: boolean;
  approvedAt?: string;
  specialtyData?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSOAPInput {
  visitId: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  advice?: string;
  followUp?: string;
  clinicalSummary?: string;
  icdCodes?: string[];
  specialtyData?: Record<string, unknown>;
}

export interface UpdateSOAPInput {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  advice?: string;
  followUp?: string;
  clinicalSummary?: string;
  icdCodes?: string[];
  specialtyData?: Record<string, unknown>;
}
