import type { AppointmentRepository } from '../ports/appointment.repository';
import type { CreateAppointmentDto } from '@mmc/types';
import { type Result, ok } from '../../../shared/result';
import { BadRequestError } from '../../../shared/errors';

export class BookAppointmentUseCase {
  constructor(private readonly repo: AppointmentRepository) {}

  async execute(dto: CreateAppointmentDto): Promise<Result<{ id: number }>> {
    if (!dto.bookingDate) throw new BadRequestError('Booking date is required');
    const id = await this.repo.create(dto);
    return ok({ id });
  }
}
