import type { PatientSummary } from '@mmc/types';
import type { PatientRepository } from '../ports/patient.repository';
import { type Result, ok } from '../../../shared/result';

interface ListPatientsInput {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  doctorId?: number;
}

export class ListPatientsUseCase {
  constructor(private readonly patientRepo: PatientRepository) {}

  async execute(input: ListPatientsInput): Promise<Result<{ data: PatientSummary[]; total: number }>> {
    const result = await this.patientRepo.findAll(input);
    return ok(result);
  }
}
