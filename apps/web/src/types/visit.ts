import type { Patient } from './patient';
import type { SOAPNote } from './soap';
import type { Prescription } from './prescription';

export type VisitStatus = 'SCHEDULED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type VisitType = 'CONSULTATION' | 'FOLLOW_UP' | 'EMERGENCY' | 'PROCEDURE' | 'VACCINATION' | 'VIDEO' | 'AUDIO';
export type Specialty = 'ALLOPATHY' | 'HOMEOPATHY' | 'GENERAL';

export interface Visit {
  id: string;
  tenantId: string;
  patientId: string;
  doctorId: string;
  visitNumber: string;
  specialty: Specialty;
  status: VisitStatus;
  chiefComplaint?: string;
  visitType: VisitType;
  scheduledAt?: string;
  checkedInAt: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  patient?: Pick<Patient, 'id' | 'firstName' | 'lastName' | 'mrn' | 'gender'>;
  doctor?: { id: string; firstName: string; lastName: string };
  vitals?: Vitals;
  soap?: SOAPNote;
  prescriptions?: Prescription[];
}

export interface Vitals {
  id: string;
  visitId: string;
  heightCm?: number;
  weightKg?: number;
  bmi?: number;
  temperatureF?: number;
  pulseRate?: number;
  systolicBp?: number;
  diastolicBp?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  bloodSugar?: number;
  notes?: string;
  recordedAt: string;
}

export interface CreateVisitInput {
  patientId: string;
  doctorId: string;
  specialty: Specialty;
  chiefComplaint?: string;
  visitType?: VisitType;
  scheduledAt?: string;
  notes?: string;
}

export interface UpdateVisitStatusInput {
  status: VisitStatus;
  cancelReason?: string;
}

export interface RecordVitalsInput {
  heightCm?: number;
  weightKg?: number;
  temperatureF?: number;
  pulseRate?: number;
  systolicBp?: number;
  diastolicBp?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  bloodSugar?: number;
  notes?: string;
}

export interface QueryVisitParams {
  status?: VisitStatus;
  doctorId?: string;
  patientId?: string;
  specialty?: Specialty;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface VisitListResponse {
  visits: Visit[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
