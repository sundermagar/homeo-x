import type { Result } from '../../../shared/result';

export interface MedicalCase {
  id: number;
  regid: number;
  clinicId?: number | null;
  doctorId?: number | null;
  status: string;
  condition?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface Vitals {
  id: number;
  visitId: number;
  heightCm?: number | null;
  weightKg?: number | null;
  bmi?: number | null;
  temperatureF?: number | null;
  pulseRate?: number | null;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  respiratoryRate?: number | null;
  oxygenSaturation?: number | null;
  bloodSugar?: number | null;
  notes?: string | null;
  recordedAt?: Date | null;
}

export interface SoapNotes {
  id: number;
  visitId: number;
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan?: string | null;
  advice?: string | null;
  followUp?: string | null;
  icdCodes?: any;
}

export interface HomeoDetails {
  id: number;
  regid: number;
  thermal?: string | null;
  constitutional?: string | null;
  miasm?: string | null;
}

export interface CaseNote {
  id: number;
  regid: number;
  notes: string;
  notesType: string;
  dateval?: string;
}

export interface CaseExamination {
  id: number;
  regid: number;
  examinationDate?: string;
  bpSystolic?: number;
  bpDiastolic?: number;
  findings?: string;
}

export interface CaseImage {
  id: number;
  regid: number;
  picture: string;
  description?: string;
}

export interface Investigation {
  id: number;
  regid: number;
  visitId?: number;
  type: string;
  data: any;
  investDate?: string;
}

export interface Prescription {
  id: number;
  regid: number;
  visitId?: number;
  dateval?: string;
  medicineId?: number;
  remedyName?: string; // Virtual join field
  potencyId?: number;
  frequencyId?: number;
  days?: number;
  instructions?: string;
}

export interface FullCaseData {
  medicalCase: MedicalCase;
  vitals?: Vitals[];
  soap?: SoapNotes[];
  homeo?: HomeoDetails | null;
  notes?: CaseNote[];
  examination?: CaseExamination[];
  images?: CaseImage[];
  investigations?: Investigation[];
  prescriptions?: Prescription[];
}

export interface MedicalCaseRepository {
  findById(id: number): Promise<MedicalCase | null>;
  findByRegId(regid: number): Promise<MedicalCase[]>;
  create(data: Partial<MedicalCase>): Promise<number>;
  update(id: number, data: Partial<MedicalCase>): Promise<void>;
  findMany(filters: { search?: string; page?: number; limit?: number }): Promise<{ data: any[]; total: number }>;
  
  // High-level clinical aggregate
  getUnifiedCaseData(regid: number): Promise<FullCaseData | null>;

  // Sub-entity operations
  saveVitals(data: Partial<Vitals>): Promise<void>;
  getVitals(visitId: number): Promise<Vitals | null>;
  
  saveSoapNotes(data: Partial<SoapNotes>): Promise<void>;
  getSoapNotes(visitId: number): Promise<SoapNotes | null>;
  
  saveHomeoDetails(data: Partial<HomeoDetails>): Promise<void>;
  getHomeoDetails(regid: number): Promise<HomeoDetails | null>;

  saveNote(data: Partial<CaseNote>): Promise<void>;
  deleteNote(id: number): Promise<void>;

  saveExamination(data: Partial<CaseExamination>): Promise<void>;
  deleteExamination(id: number): Promise<void>;

  saveImage(data: Partial<CaseImage>): Promise<number>;
  deleteImage(id: number): Promise<void>;

  saveInvestigation(data: Partial<Investigation>): Promise<void>;
  deleteInvestigation(id: number, type: string): Promise<void>;

  savePrescription(data: Partial<Prescription>): Promise<void>;
  deletePrescription(id: number): Promise<void>;
}
