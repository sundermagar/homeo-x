import type { PatientBillSummary } from '@mmc/types';
import type { BillingRepository } from '../ports/billing.repository';
import { type Result, ok, fail } from '../../../shared/result';

export class GetPatientBillsUseCase {
  constructor(private readonly billingRepo: BillingRepository) {}

  async execute(regid: number): Promise<Result<PatientBillSummary>> {
    if (!regid || regid <= 0) {
      return fail('Invalid patient registration ID');
    }
    const summary = await this.billingRepo.findByRegid(regid);
    return ok(summary);
  }
}
