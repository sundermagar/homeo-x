import { type ConsentRepository, type GrantConsentDto } from '../ports/consent.repository.js';
import { type Result, ok, fail } from '../../../shared/result.js';

export class GrantConsentUseCase {
  constructor(private readonly consentRepository: ConsentRepository) {}

  async execute(data: GrantConsentDto): Promise<Result<void>> {
    try {
      if (!data.patientRegid) {
        return fail('Patient registration ID is required', 'BAD_REQUEST');
      }
      if (!data.consentType) {
        return fail('Consent type is required', 'BAD_REQUEST');
      }

      await this.consentRepository.grant(data);
      return ok(undefined);
    } catch (err: any) {
      return fail(err.message || 'Failed to grant consent', 'INTERNAL_ERROR');
    }
  }
}
