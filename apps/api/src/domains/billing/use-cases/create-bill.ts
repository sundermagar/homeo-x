import type { Bill } from '@mmc/types';
import type { BillingRepository } from '../ports/billing.repository';
import type { AppointmentRepository } from '../../appointment/ports/appointment.repository';
import type { CreateBillInput } from '@mmc/validation';
import { type Result, ok, fail } from '../../../shared/result';

export class CreateBillUseCase {
  constructor(
    private readonly billingRepo: BillingRepository,
    private readonly appointmentRepo: AppointmentRepository
  ) {}

  async execute(input: CreateBillInput): Promise<Result<Bill>> {
    if (input.received > input.charges) {
      return fail('Received amount cannot exceed total charges');
    }

    const billNo = await this.billingRepo.nextBillNo();

    const bill = await this.billingRepo.create({
      ...input,
      billNo,
    });

    // Auto-update today's active appointments for this patient to 'Done'
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: appointments } = await this.appointmentRepo.findMany({
        patientId: input.regid,
        date: today,
      });

      const activeStatuses = ['Pending', 'Confirmed', 'Consultation', 'Waitlist', 'Registered'];
      for (const appt of appointments) {
        if (activeStatuses.includes(appt.status)) {
          await this.appointmentRepo.updateStatus(appt.id, 'Done');
        }
      }
    } catch (err) {
      console.warn('[Billing] could not auto-update appointment status:', err);
    }

    return ok(bill);
  }
}

