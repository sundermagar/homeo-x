import type { Payment } from '@mmc/types';
import type { PaymentRepository } from '../ports/payment.repository';
import type { BillingRepository } from '../ports/billing.repository';
import type { RecordManualPaymentInput } from '@mmc/validation';
import { type Result, ok, fail } from '../../../shared/result';

export class RecordManualPaymentUseCase {
  constructor(
    private readonly paymentRepo: PaymentRepository,
    private readonly billingRepo: BillingRepository,
  ) {}

  async execute(input: RecordManualPaymentInput): Promise<Result<Payment>> {
    if (input.paymentMode === 'Online') {
      return fail('Online payments must go through the Razorpay verify flow');
    }

    const payment = await this.paymentRepo.create({
      regid: input.regid,
      billId: input.billId,
      amount: input.amount,
      currency: 'INR',
      status: 'Completed',
      paymentMode: input.paymentMode,
      paymentDate: input.receivedDate ? new Date(input.receivedDate) : new Date(),
    });

    // Update linked bill received amount if bill_id provided
    if (input.billId && input.amount) {
      await this.billingRepo.updateReceived(input.billId, input.amount, input.paymentMode);
    }

    return ok(payment);
  }
}
