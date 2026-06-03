import type { BillingRepository, PatientBalance } from '../ports/billing.repository.js';
import { type Result, ok, fail } from '../../../shared/result.js';

export class GetPatientBalancesUseCase {
  constructor(private readonly repo: BillingRepository) {}

  async execute(clinicId?: number): Promise<Result<PatientBalance[]>> {
    try {
      const data = await this.repo.getPatientBalances(clinicId);
      return ok(data);
    } catch (error) {
      console.error('[GetPatientBalancesUseCase] Error:', error);
      return fail('Failed to fetch patient balances');
    }
  }
}

export class UpdatePatientBalanceNoteUseCase {
  constructor(private readonly repo: BillingRepository) {}

  async execute(regid: number, note: string): Promise<Result<boolean>> {
    try {
      await this.repo.updateBalanceNote(regid, note);
      return ok(true);
    } catch (error) {
      console.error('[UpdatePatientBalanceNoteUseCase] Error:', error);
      return fail('Failed to update patient balance note');
    }
  }
}
