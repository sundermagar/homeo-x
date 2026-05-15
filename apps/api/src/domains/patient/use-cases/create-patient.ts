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
    // ─── Parallelize Patient Creation and Org Lookup ───
    const [patient, org] = await Promise.all([
      this.patientRepo.create({ ...input, clinicId }),
      clinicId ? this.orgRepo.findById(clinicId) : Promise.resolve(null)
    ]);

    // ─── Background: Auto-bill registration fee ───
    if (clinicId && org?.registrationFee && org.registrationFee > 0) {
      (async () => {
        try {
          const billNo = await this.billingRepo.nextBillNo();
          await this.billingRepo.create({
            regid: patient.regid,
            billNo,
            billDate: new Date().toISOString().split('T')[0],
            charges: org.registrationFee || 0,
            received: 0,
            paymentMode: 'Cash',
            billType: 'Registration',
            treatment: 'Registration Fee',
            customTitle: 'Registration Fee',
          });
          console.log(`[CreatePatient] Auto-bill generated for RegID: ${patient.regid}`);
        } catch (err) {
          console.warn('[CreatePatient] registration fee billing failed in background:', err);
        }
      })();
    }

    // ─── Background: Link to unregistered patient record ───
    if (input.unregisteredId) {
      this.patientRepo.linkUnregisteredToFormal(input.unregisteredId, patient.id)
        .catch(err => console.warn('[CreatePatient] linkUnregisteredToFormal failed:', err));
    }

    return ok({ patient });
  }
}
