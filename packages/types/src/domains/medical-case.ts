import type { CaseStatus } from '../enums';

export interface MedicalCase {
  id: number;
  regid: number;
  clinicId: number;
  doctorId: number | null;
  status: CaseStatus;
  condition: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface Vitals {
  id: number;
  visitId: number;
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  temperatureF: number | null;
  pulseRate: number | null;
  systolicBp: number | null;
  diastolicBp: number | null;
  respiratoryRate: number | null;
  oxygenSaturation: number | null;
  bloodSugar: number | null;
  notes: string | null;
  recordedAt: Date;
}

export interface SoapNote {
  id: number;
  visitId: number;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  advice: string | null;
  followUp: string | null;
  icdCodes: string[] | null;
  aiGenerated: boolean;
  aiConfidence: number | null;
  doctorApproved: boolean;
  approvedAt: Date | null;
}

export interface HomeoDetail {
  id: number;
  regid: number;
  thermal: string | null;
  constitutional: string | null;
  miasm: string | null;
  deletedAt: Date | null;
}
