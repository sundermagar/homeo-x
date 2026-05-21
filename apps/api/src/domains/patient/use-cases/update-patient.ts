import type { Patient } from '@mmc/types';
import type { PatientRepository } from '../ports/patient.repository.js';
import type { BillingRepository } from '../../billing/ports/billing.repository.js';
import { type Result, ok, fail } from '../../../shared/result.js';
import type { UpdatePatientInput } from '@mmc/validation';

export class UpdatePatientUseCase {
  constructor(
    private readonly patientRepo: PatientRepository,
    private readonly billingRepo?: BillingRepository
  ) {}

  async execute(regid: number, input: UpdatePatientInput): Promise<Result<Patient>> {
    const updated = await this.patientRepo.update(regid, input);
    if (!updated) return fail(`Patient #${regid} not found`, 'NOT_FOUND');

    // If consultation fee is updated, sync with today's bill for billing summary consistency
    if (this.billingRepo && input.consultationFee !== undefined) {
      try {
        const summary = await this.billingRepo.findByRegid(regid);
        
        // Update the most recent bill for this patient
        const mostRecentBill = summary.bills[0];

        if (mostRecentBill && mostRecentBill.id) {
          await this.billingRepo.updateCharges(mostRecentBill.id, input.consultationFee);
        }
      } catch (err) {
        console.warn(`[UpdatePatientUseCase] Failed to sync billing charge:`, err);
        // We don't fail the patient update if billing sync fails
      }
    }

    return ok(updated);
  }
}
