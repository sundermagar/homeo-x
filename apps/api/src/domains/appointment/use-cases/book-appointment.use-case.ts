import type { AppointmentRepository } from '../ports/appointment.repository';
import type { CreateAppointmentDto } from '@mmc/types';
import { type Result, ok, fail } from '../../../shared/result';
import type { SendSmsUseCase } from '../../communication/use-cases/send-sms.use-case';

export class BookAppointmentUseCase {
  constructor(
    private readonly repo: AppointmentRepository,
    private readonly sms?: SendSmsUseCase
  ) {}

  async execute(dto: CreateAppointmentDto): Promise<Result<{ id: number }>> {
    if (!dto.bookingDate) return fail('Booking date is required', 'VALIDATION');
    const id = await this.repo.create(dto);

    // Trigger SMS confirmation if service and phone are available
    if (this.sms && dto.phone && dto.patientName) {
      this.sms.sendAppointmentConfirmation({
        phone: dto.phone,
        patientName: dto.patientName,
        date: dto.bookingDate,
        time: dto.bookingTime ?? '',
        clinicName: 'Kreed.health Clinic' // Fixed for now, can be dynamic
      }).catch(() => {
        // Log error but don't fail the whole booking result
      });
    }

    return ok({ id });
  }
}
