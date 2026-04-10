import type { AppointmentRepository } from '../ports/appointment.repository';
import type { Appointment, AvailabilitySlot } from '@mmc/types';
import { type Result, ok, fail } from '../../../shared/result';
import { NotFoundError } from '../../../shared/errors';

export class GetAppointmentUseCase {
  constructor(private readonly repo: AppointmentRepository) {}

  async getById(id: number): Promise<Result<Appointment>> {
    const appt = await this.repo.findById(id);
    if (!appt) throw new NotFoundError('Appointment not found');
    return ok(appt);
  }

  async getToday(doctorId?: number): Promise<Result<Appointment[]>> {
    const result = await this.repo.findToday(doctorId);
    return ok(result);
  }

  async getAvailability(doctorId: number, date: string): Promise<Result<AvailabilitySlot[]>> {
    const result = await this.repo.findAvailableSlots(doctorId, date);
    return ok(result);
  }
}
