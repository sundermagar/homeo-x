import type { BillingRepository } from '../ports/billing.repository.js';
import type { Bill } from '@mmc/types';

export class UpdateChargesUseCase {
  constructor(private readonly billingRepo: BillingRepository) {}

  async execute(id: number, amount: number): Promise<{ success: boolean; data?: Bill; error?: string }> {
    try {
      if (!id || amount < 0) {
        return { success: false, error: 'Invalid bill ID or amount' };
      }

      const bill = await this.billingRepo.updateCharges(id, amount);
      if (!bill) {
        return { success: false, error: 'Bill not found' };
      }

      return { success: true, data: bill };
    } catch (err: any) {
      console.error('[UpdateChargesUseCase] Error:', err);
      return { success: false, error: err.message };
    }
  }
}
