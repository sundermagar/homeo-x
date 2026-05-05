import type { PatientRepository } from '../ports/patient.repository.js';
import { type Result, ok, fail } from '../../../shared/result.js';

export class DeletePatientUseCase {
  constructor(private readonly patientRepo: PatientRepository) {}

  async execute(regid: number): Promise<Result<boolean>> {
    const deleted = await this.patientRepo.softDelete(regid);
    if (!deleted) return fail(`Patient #${regid} not found`, 'NOT_FOUND');
    return ok(true);
  }
}
