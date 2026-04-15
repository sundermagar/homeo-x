import type { Specialty } from './visit';

export interface PrescriptionItem {
  id: string;
  prescriptionId: string;
  medicationName: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  duration: string;
  route?: string;
  instructions?: string;
  quantity?: number;
  specialtyData?: Record<string, unknown>;
}

export interface Prescription {
  id: string;
  visitId: string;
  specialty: Specialty;
  status: 'DRAFT' | 'APPROVED' | 'DISPENSED' | 'CANCELLED';
  notes?: string;
  aiSuggested: boolean;
  doctorApproved: boolean;
  approvedAt?: string;
  items: PrescriptionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePrescriptionItemInput {
  medicationName: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  duration: string;
  route?: string;
  instructions?: string;
  quantity?: number;
  specialtyData?: Record<string, unknown>;
}

export interface CreatePrescriptionInput {
  visitId: string;
  specialty: Specialty;
  notes?: string;
  items: CreatePrescriptionItemInput[];
}
