import type { Bill } from '@mmc/types';
import type { BillingRepository } from '../ports/billing.repository.js';
import type { CreateCustomBillInput } from '@mmc/validation';
import { type Result, ok, fail } from '../../../shared/result.js';

export class CreateCustomBillUseCase {
  constructor(private readonly billingRepo: BillingRepository) {}

  async execute(input: CreateCustomBillInput): Promise<Result<Bill>> {
    if (input.received > input.charges) {
      return fail('Received amount cannot exceed total charges');
    }

    const billNo = await this.billingRepo.nextBillNo();

    const bill = await this.billingRepo.create({
      regid: input.regid,
      charges: input.charges,
      received: input.received ?? 0,
      paymentMode: input.paymentMode ?? 'Cash',
      billDate: input.billDate,
      notes: input.notes,
      fromDate: input.fromDate,
      toDate: input.toDate,
      billNo,
      billType: 'Custom',
      customTitle: input.customTitle,
    });

    return ok(bill);
  }
}
