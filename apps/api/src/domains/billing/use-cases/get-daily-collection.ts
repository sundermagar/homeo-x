import type { DailyCollectionSummary } from '@mmc/types';
import type { BillingRepository } from '../ports/billing.repository';
import { type Result, ok } from '../../../shared/result';

export class GetDailyCollectionUseCase {
  constructor(private readonly billingRepo: BillingRepository) {}

  async execute(date?: string): Promise<Result<DailyCollectionSummary>> {
    const target: string = date || new Date().toISOString().slice(0, 10);
    const summary = await this.billingRepo.findDailyCollection(target);
    return ok(summary);
  }
}
