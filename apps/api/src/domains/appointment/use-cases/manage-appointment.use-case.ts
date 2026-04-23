import type { AppointmentRepository } from '../ports/appointment.repository';
import { AppointmentStatus, type UpdateAppointmentDto } from '@mmc/types';
import { type Result, ok, fail } from '../../../shared/result';

export class ManageAppointmentUseCase {
  constructor(private readonly repo: AppointmentRepository) {}

  async update(id: number, dto: UpdateAppointmentDto): Promise<Result<void>> {
    const appt = await this.repo.findById(id);
    if (!appt) return fail('Appointment not found', 'NOT_FOUND');
    await this.repo.update(id, dto);
    return ok(undefined);
  }

  async delete(id: number): Promise<Result<void>> {
    const appt = await this.repo.findById(id);
    if (!appt) return fail('Appointment not found', 'NOT_FOUND');
    await this.repo.softDelete(id);
    if (appt.doctorId && appt.bookingDate) {
      await this.repo.promoteWaitlist(appt.doctorId, appt.bookingDate, appt.bookingTime);
    }
    return ok(undefined);
  }

  async updateStatus(id: number, status: string, cancellationReason?: string): Promise<Result<void>> {
    const appt = await this.repo.findById(id);
    if (!appt) return fail('Appointment not found', 'NOT_FOUND');

    const valid = Object.values(AppointmentStatus) as string[];
    if (!valid.includes(status)) {
      return fail(`Invalid status: ${status}`, 'VALIDATION');
    }

    await this.repo.updateStatus(id, status, cancellationReason);

    if ([AppointmentStatus.Cancelled, AppointmentStatus.Absent].includes(status as AppointmentStatus)) {
      if (appt.doctorId && appt.bookingDate) {
        await this.repo.promoteWaitlist(appt.doctorId, appt.bookingDate, appt.bookingTime);
      }
    }
    return ok(undefined);
  }

  async issueToken(id: number): Promise<Result<{ token: number; alreadyIssued: boolean }>> {
    const appt = await this.repo.findById(id);
    if (!appt) return fail('Appointment not found', 'NOT_FOUND');

    if (appt.tokenNo) return ok({ token: appt.tokenNo, alreadyIssued: true });

    const token = await this.repo.issueToken(id);
    return ok({ token, alreadyIssued: false });
  }

  async reschedule(id: number, date: string, time?: string): Promise<Result<void>> {
    const appt = await this.repo.findById(id);
    if (!appt) return fail('Appointment not found', 'NOT_FOUND');
    await this.repo.update(id, { bookingDate: date, bookingTime: time });
    return ok(undefined);
  }
}
