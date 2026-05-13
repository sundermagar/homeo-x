import { type ConsentRepository } from '../ports/consent.repository.js';
import { type Result, ok, fail } from '../../../shared/result.js';

export class RevokeConsentUseCase {
  constructor(private readonly consentRepository: ConsentRepository) {}

  async execute(patientRegid: number, consentType: string): Promise<Result<void>> {
    try {
      if (!patientRegid) {
        return fail('Patient registration ID is required', 'BAD_REQUEST');
      }
      if (!consentType) {
        return fail('Consent type is required', 'BAD_REQUEST');
      }

      await this.consentRepository.revoke(patientRegid, consentType);
      return ok(undefined);
    } catch (err: any) {
      return fail(err.message || 'Failed to revoke consent', 'INTERNAL_ERROR');
    }
  }
}
