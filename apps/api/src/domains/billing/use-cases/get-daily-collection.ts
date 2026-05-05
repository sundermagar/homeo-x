import type { DailyCollectionSummary } from '@mmc/types';
import type { BillingRepository } from '../ports/billing.repository.js';
import { type Result, ok } from '../../../shared/result.js';

export class GetDailyCollectionUseCase {
  constructor(private readonly billingRepo: BillingRepository) {}

  async execute(date?: string, clinicId?: number): Promise<Result<DailyCollectionSummary>> {
    const target: string = date || new Date().toISOString().slice(0, 10);
    const summary = await this.billingRepo.findDailyCollection(target, clinicId);
    return ok(summary);
  }
}
