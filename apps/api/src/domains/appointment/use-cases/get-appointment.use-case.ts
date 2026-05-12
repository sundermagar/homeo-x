import type { AppointmentRepository } from '../ports/appointment.repository.js';
import type { Appointment, AvailabilitySlot } from '@mmc/types';
import { type Result, ok, fail } from '../../../shared/result.js';

export class GetAppointmentUseCase {
  constructor(private readonly repo: AppointmentRepository) {}

  async getById(id: number): Promise<Result<Appointment>> {
    const appt = await this.repo.findById(id);
    if (!appt) return fail('Appointment not found', 'NOT_FOUND');
    return ok(appt);
  }

  async getToday(doctorId?: number, clinicId?: number): Promise<Result<Appointment[]>> {
    const result = await this.repo.findToday(doctorId, clinicId);
    return ok(result);
  }

  async getAvailability(doctorId: number, date: string): Promise<Result<AvailabilitySlot[]>> {
    const result = await this.repo.findAvailableSlots(doctorId, date);
    return ok(result);
  }
}
