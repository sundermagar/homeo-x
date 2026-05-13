import { type ConsentRepository, type ConsentRecord } from '../ports/consent.repository.js';
import { type Result, ok, fail } from '../../../shared/result.js';

export class GetConsentStatusUseCase {
  constructor(private readonly consentRepository: ConsentRepository) {}

  async execute(patientRegid: number): Promise<Result<ConsentRecord[]>> {
    try {
      if (!patientRegid) {
        return fail('Patient registration ID is required', 'BAD_REQUEST');
      }

      const records = await this.consentRepository.findByPatient(patientRegid);
      return ok(records);
    } catch (err: any) {
      return fail(err.message || 'Failed to fetch consent status', 'INTERNAL_ERROR');
    }
  }
}
