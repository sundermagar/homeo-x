import type { Bill } from '@mmc/types';
import type { PaymentRepository } from '../ports/payment.repository.js';
import type { BillingRepository } from '../ports/billing.repository.js';
import type { CreateCustomBillInput } from '@mmc/validation';
import { type Result, ok, fail } from '../../../shared/result.js';

export class CreateCustomBillUseCase {
  constructor(
    private readonly billingRepo: BillingRepository,
    private readonly paymentRepo: PaymentRepository,
  ) {}

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

    if (input.received && input.received > 0) {
      await this.paymentRepo.create({
        regid: input.regid,
        billId: bill.id,
        amount: input.received,
        currency: 'INR',
        status: 'Completed',
        paymentMode: input.paymentMode ?? 'Cash',
        paymentDate: input.billDate ? new Date(input.billDate) : new Date(),
      });
    }

    return ok(bill);
  }
}
