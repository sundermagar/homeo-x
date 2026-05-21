import type { Bill } from '@mmc/types';
import type { BillingRepository } from '../ports/billing.repository.js';
import type { CreateBillInput } from '@mmc/validation';
import { type Result, ok, fail } from '../../../shared/result.js';

export class CreateBillUseCase {
  constructor(private readonly billingRepo: BillingRepository) {}

  async execute(input: CreateBillInput): Promise<Result<Bill>> {
    if (input.received > input.charges) {
      return fail('Received amount cannot exceed total charges');
    }

    const billNo = await this.billingRepo.nextBillNo();

    const bill = await this.billingRepo.create({
      ...input,
      billNo,
    });

    return ok(bill);
  }
}
