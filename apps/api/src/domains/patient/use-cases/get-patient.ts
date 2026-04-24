import type { Patient } from '@mmc/types';
import type { PatientRepository } from '../ports/patient.repository';
import { type Result, ok, fail } from '../../../shared/result';

export class GetPatientUseCase {
  constructor(private readonly patientRepo: PatientRepository) {}

  async execute(regid: number): Promise<Result<Patient>> {
    let patient = await this.patientRepo.findByRegid(regid);
    
    // Fallback: If not found by regid, try searching by internal ID
    // This is crucial for patients whose regid/id mismatch was caused by 
    // older logic, ensuring the "View" button still works.
    if (!patient) {
      patient = await this.patientRepo.findById(regid);
    }

    if (!patient) return fail(`Patient #${regid} not found`, 'NOT_FOUND');
    return ok(patient);
  }
}
