import type { Patient, PatientSummary, FamilyMember, PatientFormMeta } from '@mmc/types';
import type { CreatePatientInput, UpdatePatientInput, FamilyMemberInput } from '@mmc/validation';

/**
 * Patient Repository Port — defines what the domain needs from persistence.
 * The infrastructure layer provides the concrete adapter (PostgreSQL, in-memory, etc.)
 */
export interface PatientRepository {
  findById(id: number): Promise<Patient | null>;
  findByRegid(regid: number): Promise<Patient | null>;
  findAll(params: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ data: PatientSummary[]; total: number }>;
  create(data: CreatePatientInput): Promise<Patient>;
  update(regid: number, data: UpdatePatientInput): Promise<Patient | null>;
  softDelete(regid: number): Promise<boolean>;
  lookup(query: string, limit?: number): Promise<PatientSummary[]>;
  findBirthdays(mmdd: string): Promise<PatientSummary[]>;

  // Form meta — dropdown data
  getFormMeta(): Promise<PatientFormMeta>;

  // Family group
  getFamilyGroups(params: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<{ data: any[]; total: number }>;

  getFamilyMembers(regid: number): Promise<FamilyMember[]>;
  addFamilyMember(regid: number, data: FamilyMemberInput): Promise<FamilyMember>;
  removeFamilyMember(id: number): Promise<boolean>;
}
