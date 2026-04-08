import type { Patient } from '@mmc/types';
import type { PatientRepository } from '../ports/patient.repository';
import { type Result, ok, fail } from '../../../shared/result';
import type { UpdatePatientInput } from '@mmc/validation';

export class UpdatePatientUseCase {
  constructor(private readonly patientRepo: PatientRepository) {}

  async execute(regid: number, input: UpdatePatientInput): Promise<Result<Patient>> {
    const updated = await this.patientRepo.update(regid, input);
    if (!updated) return fail(`Patient #${regid} not found`, 'NOT_FOUND');
    return ok(updated);
  }
}
