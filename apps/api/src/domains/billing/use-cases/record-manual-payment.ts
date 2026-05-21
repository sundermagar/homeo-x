import type { Payment } from '@mmc/types';
import type { PaymentRepository } from '../ports/payment.repository.js';
import type { BillingRepository } from '../ports/billing.repository.js';
import type { RecordManualPaymentInput } from '@mmc/validation';
import { type Result, ok, fail } from '../../../shared/result.js';

export class RecordManualPaymentUseCase {
  constructor(
    private readonly paymentRepo: PaymentRepository,
    private readonly billingRepo: BillingRepository,
  ) {}

  async execute(input: RecordManualPaymentInput): Promise<Result<Payment[]>> {
    if (input.paymentMode === 'Online') {
      return fail('Online payments must go through the Razorpay verify flow');
    }

    const payments: Payment[] = [];
    let totalAmount = 0;
    const modesUsed: string[] = [];

    if (input.splitPayments && input.splitPayments.length > 0) {
      for (const split of input.splitPayments) {
        if (split.amount <= 0) continue;
        
        const p = await this.paymentRepo.create({
          regid: input.regid,
          billId: input.billId,
          amount: split.amount,
          currency: 'INR',
          status: 'Completed',
          paymentMode: split.paymentMode,
          paymentDate: input.receivedDate ? new Date(input.receivedDate) : new Date(),
        });
        payments.push(p);
        totalAmount += split.amount;
        if (!modesUsed.includes(split.paymentMode)) {
          modesUsed.push(split.paymentMode);
        }
      }
    } else if (input.amount && input.amount > 0) {
      const p = await this.paymentRepo.create({
        regid: input.regid,
        billId: input.billId,
        amount: input.amount,
        currency: 'INR',
        status: 'Completed',
        paymentMode: input.paymentMode ?? 'Cash',
        paymentDate: input.receivedDate ? new Date(input.receivedDate) : new Date(),
      });
      payments.push(p);
      totalAmount = input.amount;
      modesUsed.push(input.paymentMode ?? 'Cash');
    }

    // Update linked bill received amount if billId provided
    if (input.billId && totalAmount > 0) {
      await this.billingRepo.updateReceived(input.billId, totalAmount, modesUsed.join(', '));
    }

    return ok(payments);
  }

}
