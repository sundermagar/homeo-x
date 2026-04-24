import Razorpay from 'razorpay';
import { razorpayBreaker } from '../../shared/resilience/circuit-breaker';
import type { RazorpayService, RazorpayOrder } from '../../domains/billing';
import { createLogger } from '../../shared/logger';

const logger = createLogger('razorpay-service');

export class RazorpayServiceAdapter implements RazorpayService {
  private client: Razorpay | null = null;

  constructor(keyId: string | null, keySecret: string | null) {
    if (keyId && keySecret) {
      this.client = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
      logger.info('Razorpay client initialized');
    } else {
      logger.warn('Razorpay keys missing. Service will be unavailable.');
    }
  }

  async createOrder(params: {
    amount: number;
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
  }): Promise<RazorpayOrder> {
    if (!this.client) {
      throw new Error('Razorpay client not configured');
    }

    return razorpayBreaker.execute(async () => {
      try {
        const order = await this.client!.orders.create({
          amount: params.amount,
          currency: params.currency,
          receipt: params.receipt,
          notes: params.notes,
        });

        return {
          id: order.id,
          amount: order.amount as number,
          currency: order.currency as string,
          receipt: order.receipt as string,
        };
      } catch (err: any) {
        logger.error(`Razorpay order creation failed: ${err.message}`);
        throw err;
      }
    });
  }
}
