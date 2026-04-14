import type { AppointmentRepository } from '../ports/appointment.repository';
import type { CreateAppointmentDto } from '@mmc/types';
import { type Result, ok, fail } from '../../../shared/result';

export class BookAppointmentUseCase {
  constructor(private readonly repo: AppointmentRepository) {}

  async execute(dto: CreateAppointmentDto): Promise<Result<{ id: number }>> {
    if (!dto.bookingDate) return fail('Booking date is required', 'VALIDATION');
    const id = await this.repo.create(dto);
    return ok({ id });
  }
}
