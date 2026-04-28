import type { Visit, Vitals } from './visit';
import type { SOAPNote } from './soap';
import type { Prescription, CreatePrescriptionItemInput } from './prescription';
import type { SpecialtyConfig } from './specialty';
import type { Patient } from './patient';

export interface StartConsultationInput {
  visitId: string;
}

export interface UiHints {
  showPotencySelector?: boolean;
  showDosageChips?: boolean;
  showFrequencyChips?: boolean;
  showRouteChips?: boolean;
  showTitrationFields?: boolean;
  showTrendGraphs?: boolean;
  showRemedySelector?: boolean;
  showRepeatPlanShortcut?: boolean;
  prescriptionLabel?: string;
}

export interface StartConsultationResponse {
  visit: Visit;
  templates: {
    soap: Record<string, unknown>;
    prescriptionItem: Record<string, unknown>;
  };
  specialtyConfig: SpecialtyConfig;
  clinicCategory?: string;
  prescriptionStrategy?: string;
  uiHints?: UiHints;
}

export interface CompleteConsultationInput {
  visitId: string;
  soap?: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    icdCodes?: string[];
    advice?: string;
    followUp?: string;
    clinicalSummary?: string;
    specialtyData?: Record<string, unknown>;
  };
  prescription?: {
    notes?: string;
    items: CreatePrescriptionItemInput[];
  };
  labOrders?: Array<{
    testName: string;
    testCode?: string;
    category?: string;
    priority?: 'STAT' | 'URGENT' | 'ROUTINE';
    aiSuggested?: boolean;
  }>;
  autoApprove?: boolean;
}

export interface CompleteConsultationResponse {
  visit: Visit;
  soap: SOAPNote | null;
  prescription: Prescription | null;
}

export interface ConsultationSummary {
  visit: Visit;
  patient: Patient | null;
  doctor: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    registrationNumber?: string;
    qualifications?: string;
    specialization?: string;
  } | null;
  vitals: Vitals | null;
  soap: SOAPNote | null;
  prescriptions: Prescription[];
  specialtyConfig: SpecialtyConfig;
  clinicCategory?: string;
  prescriptionStrategy?: string;
  uiHints?: UiHints;
}
