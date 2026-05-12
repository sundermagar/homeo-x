import type { Patient } from '@mmc/types';
import type { PatientRepository } from '../ports/patient.repository.js';
import type { BillingRepository } from '../../billing/ports/billing.repository.js';
import type { OrganizationRepository } from '../../platform/ports/organization.repository.js';
import { type Result, ok, fail } from '../../../shared/result.js';
import type { CreatePatientInput } from '@mmc/validation';

export class CreatePatientUseCase {
  constructor(
    private readonly patientRepo: PatientRepository,
    private readonly billingRepo: BillingRepository,
    private readonly orgRepo: OrganizationRepository,
  ) {}

  async execute(input: CreatePatientInput, clinicId?: number): Promise<Result<{ patient: Patient; registrationBillId?: number }>> {
    const patient = await this.patientRepo.create({ ...input, clinicId });

    // Auto-bill registration fee if clinic has one configured
    if (clinicId) {
      try {
        const org = await this.orgRepo.findById(clinicId);
        if (org?.registrationFee && org.registrationFee > 0) {
          const billNo = await this.billingRepo.nextBillNo();
          await this.billingRepo.create({
            regid: patient.regid,
            billNo,
            billDate: new Date().toISOString().split('T')[0],
            charges: org.registrationFee,
            received: 0,
            paymentMode: 'Cash',
            billType: 'Registration',
            treatment: 'Registration Fee',
            customTitle: 'Registration Fee',
          });
        }
      } catch (err) {
        // Billing failure should not roll back patient creation
        console.warn('[CreatePatient] registration fee billing failed:', err);
      }
    }

    // Link to unregistered patient record if exists
    if (input.unregisteredId) {
      await this.patientRepo.linkUnregisteredToFormal(input.unregisteredId, patient.id);
    }

    return ok({ patient });
  }
}
