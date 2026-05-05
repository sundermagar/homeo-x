import { type Result, ok, fail } from '../../../shared/result.js';
import type { MedicalCaseRepository } from '../ports/medical-case.repository.js';
import type { InventoryRepository } from '../../inventory/ports/inventory.repository.js';
import type { BillingRepository } from '../../billing/ports/billing.repository.js';
import type { AppointmentRepository } from '../../appointment/ports/appointment.repository.js';
import { AppointmentStatus } from '@mmc/types';

export interface FinalizeConsultationDto {
  regid: number;
  visitId: number;
  prescriptions: { medicineId: number; amount: number }[];
  consultationFee: number;
  paymentMode: string;
}

export class FinalizeConsultationUseCase {
  constructor(
    private readonly medicalCaseRepo: MedicalCaseRepository,
    private readonly inventoryRepo: InventoryRepository,
    private readonly billingRepo: BillingRepository,
    private readonly appointmentRepo: AppointmentRepository
  ) {}

  async execute(dto: FinalizeConsultationDto): Promise<Result<void>> {
    const medicalCase = await this.medicalCaseRepo.findById(dto.visitId);
    if (!medicalCase) {
      return fail(`Medical case with visit ID ${dto.visitId} not found`, 'NOT_FOUND');
    }

    // 1. Deduct Stock for each prescription
    for (const item of dto.prescriptions) {
      if (item.medicineId) {
        await this.inventoryRepo.deductStock(item.medicineId, item.amount || 1);
      }
    }

    // 2. Generate Automatic Bill
    const billNo = await this.billingRepo.nextBillNo();
    await this.billingRepo.create({
      regid: dto.regid,
      billNo,
      billDate: new Date().toISOString().split('T')[0] as string,
      charges: dto.consultationFee,
      received: 0,
      paymentMode: (dto.paymentMode || 'Cash') as any,
    });

    // 3. Update Appointment Status to Done
    await this.appointmentRepo.updateStatus(dto.visitId, AppointmentStatus.Done);

    // 4. Update Medical Case Status
    await this.medicalCaseRepo.update(dto.visitId, {
      status: 'Completed',
    });

    return ok(undefined);
  }
}
