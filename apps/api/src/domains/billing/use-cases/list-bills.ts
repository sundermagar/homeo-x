import type { BillWithPatient } from '@mmc/types';
import type { BillingRepository } from '../ports/billing.repository';
import type { ListBillsQuery } from '@mmc/validation';
import { type Result, ok } from '../../../shared/result';

export class ListBillsUseCase {
  constructor(private readonly billingRepo: BillingRepository) {}

  async execute(query: ListBillsQuery, clinicId?: number): Promise<Result<{ data: BillWithPatient[]; total: number; page: number; limit: number }>> {
    const result = await this.billingRepo.findAll(query, clinicId);
    return ok({ ...result, page: query.page, limit: query.limit });
  }
}
