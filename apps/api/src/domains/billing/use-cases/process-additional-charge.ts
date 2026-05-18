import type { AdditionalChargeRepository } from '../ports/accounts.repository.js';
import type { BillingRepository } from '../ports/billing.repository.js';
import type { MedicalCaseRepository } from '../../medical-case/ports/medical-case.repository.js';
import type { CreateAdditionalChargeInput } from '@mmc/validation';
import type { AdditionalChargeResult } from './list-additional-charges.js';
import { type Result, ok, fail } from '../../../shared/result.js';

export class ProcessAdditionalChargeUseCase {
  constructor(
    private readonly additionalChargeRepo: AdditionalChargeRepository,
    private readonly billingRepo: BillingRepository,
    private readonly medicalCaseRepo: MedicalCaseRepository
  ) {}

  async execute(input: CreateAdditionalChargeInput): Promise<AdditionalChargeResult> {
    if (!input.additionalName) return { success: false, error: 'Charge name is required' };
    if (input.additionalPrice < 0) return { success: false, error: 'Price cannot be negative' };

    try {
      // 1. Create the additional charge record
      const charge = await this.additionalChargeRepo.create(input);

      // 2. Create a custom bill for this charge
      const billNo = await this.billingRepo.nextBillNo();
      
      const today = new Date().toISOString().split('T')[0];

      await this.billingRepo.create({
        regid: input.regid!,
        charges: (input.additionalPrice || 0) * (input.additionalQuantity || 1),
        received: input.receivedPrice || 0,
        paymentMode: 'Cash',
        billDate: today,
        notes: `Additional charge: ${input.additionalName}`,
        billNo,
        billType: 'Additional',
        customTitle: input.additionalName,
      });

      // 3. Add to case potencies (prescriptions)
      await this.medicalCaseRepo.savePrescription({
        regid: input.regid!,
        dateval: today,
        instructions: `Additional Charge: ${input.additionalName}`,
        remedyName: input.additionalName,
        // using remedyName for additionalName since savePrescription takes partial Prescription
      } as any);

      return { success: true, data: charge };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}
