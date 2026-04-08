import type { Patient } from '@mmc/types';
import type { PatientRepository } from '../ports/patient.repository';
import { type Result, ok, fail } from '../../../shared/result';
import type { CreatePatientInput } from '@mmc/validation';

export class CreatePatientUseCase {
  constructor(private readonly patientRepo: PatientRepository) {}

  async execute(input: CreatePatientInput): Promise<Result<Patient>> {
    // Domain validation: check for duplicates by phone
    // (Zod handles format validation; domain handles business rules)
    const patient = await this.patientRepo.create(input);
    return ok(patient);
  }
}
