import { type Result, ok, fail } from '../../../shared/result';
import type { MedicalCaseRepository } from '../ports/medical-case.repository';
import type { InventoryRepository } from '../../inventory/ports/inventory.repository';
import type { BillingRepository } from '../../billing/ports/billing.repository';
import type { AppointmentRepository } from '../../appointment/ports/appointment.repository';
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
    const billNo = await this.billingRepo.getNextBillNumber();
    await this.billingRepo.createBill({
      regid: dto.regid,
      billNo,
      billDate: new Date().toISOString().split('T')[0],
      totalAmount: dto.consultationFee,
      receivedAmount: 0,
      paymentMode: dto.paymentMode || 'Cash',
      status: 'Pending',
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
