import type { Patient } from '@mmc/types';
import type { PatientRepository } from '../ports/patient.repository';
import { type Result, ok, fail } from '../../../shared/result';

export class GetPatientUseCase {
  constructor(private readonly patientRepo: PatientRepository) {}

  async execute(regid: number): Promise<Result<Patient>> {
    const patient = await this.patientRepo.findByRegid(regid);
    if (!patient) return fail(`Patient #${regid} not found`, 'NOT_FOUND');
    return ok(patient);
  }
}
