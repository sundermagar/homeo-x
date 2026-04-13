import { type Result, ok, fail } from '../../../shared/result';
import type { CreatePaymentOrderInput } from '@mmc/validation';

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
}

export interface RazorpayService {
  createOrder(params: {
    amount: number; // in paise
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
  }): Promise<RazorpayOrder>;
}

export class CreatePaymentOrderUseCase {
  constructor(private readonly razorpayService: RazorpayService) {}

  async execute(input: CreatePaymentOrderInput): Promise<Result<RazorpayOrder>> {
    if (input.amount <= 0) {
      return fail('Amount must be greater than zero');
    }

    try {
      const receipt = `rcpt_${input.regid ?? 'na'}_${Date.now()}`;
      const order = await this.razorpayService.createOrder({
        amount: Math.round(input.amount * 100), // convert to paise
        currency: input.currency,
        receipt,
        notes: input.notes,
      });
      return ok(order);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Razorpay order creation failed';
      return fail(msg);
    }
  }
}
