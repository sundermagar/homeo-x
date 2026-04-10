import type { AppointmentRepository, AppointmentFilters } from '../ports/appointment.repository';
import type { Appointment } from '@mmc/types';
import { type Result, ok } from '../../../shared/result';

export class ListAppointmentsUseCase {
  constructor(private readonly repo: AppointmentRepository) {}

  async execute(filters: AppointmentFilters): Promise<Result<{ data: Appointment[]; total: number }>> {
    const result = await this.repo.findMany(filters);
    return ok(result);
  }
}
