import crypto from 'node:crypto';
import type { Payment } from '@mmc/types';
import type { PaymentRepository } from '../ports/payment.repository';
import type { BillingRepository } from '../ports/billing.repository';
import type { VerifyPaymentInput } from '@mmc/validation';
import { type Result, ok, fail } from '../../../shared/result';

export class VerifyPaymentUseCase {
  constructor(
    private readonly paymentRepo: PaymentRepository,
    private readonly billingRepo: BillingRepository,
    private readonly razorpayKeySecret: string,
  ) {}

  async execute(input: VerifyPaymentInput): Promise<Result<Payment>> {
    if (!this.razorpayKeySecret) {
      return fail('Razorpay key secret is not configured');
    }

    // ── HMAC-SHA256 Signature Verification ──────────────────────────────────
    const generated = crypto
      .createHmac('sha256', this.razorpayKeySecret)
      .update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`)
      .digest('hex');

    if (generated !== input.razorpay_signature) {
      return fail('Invalid payment signature — possible tampered request');
    }

    // ── Persist verified payment ─────────────────────────────────────────────
    const payment = await this.paymentRepo.create({
      regid: input.regid,
      billId: input.billId,
      orderId: input.razorpay_order_id,
      paymentId: input.razorpay_payment_id,
      signature: input.razorpay_signature,
      amount: input.amount ?? 0,
      currency: input.currency,
      status: 'Success',
      paymentMode: input.paymentMode,
      paymentDate: new Date(),
    });

    // ── Update bill balance if a bill was linked ─────────────────────────────
    if (input.billId && input.amount) {
      await this.billingRepo.updateReceived(input.billId, input.amount, input.paymentMode);
    }

    return ok(payment);
  }
}
