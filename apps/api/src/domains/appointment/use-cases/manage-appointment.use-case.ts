import type { AppointmentRepository } from '../ports/appointment.repository.js';
import { AppointmentStatus, type UpdateAppointmentDto } from '@mmc/types';
import { type Result, ok, fail } from '../../../shared/result.js';
import type { NotificationsRepository } from '../../communication/ports/notifications.repository.js';
import { triggerNotification } from '../../../infrastructure/http/notification-trigger.js';

export class ManageAppointmentUseCase {
  constructor(
    private readonly repo: AppointmentRepository,
    private readonly notifRepo?: NotificationsRepository,
  ) {}

  private async notifyDoctor(doctorId: number, clinicId: number | undefined, type: 'APPOINTMENT_REMINDER' | 'APPOINTMENT_CANCELLED' | 'VISIT_COMPLETED', title: string, message: string): Promise<void> {
    if (!this.notifRepo) return;
    const userId = this.notifRepo.resolveUserIdForDoctor
      ? await this.notifRepo.resolveUserIdForDoctor(doctorId)
      : doctorId;
    if (!userId) return;
    await triggerNotification({ userId, clinicId, type, title, message, repo: this.notifRepo });
  }

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

      const time = appt.bookingTime ? ` at ${appt.bookingTime}` : '';
      await this.notifyDoctor(
        appt.doctorId,
        appt.clinicId ?? undefined,
        'APPOINTMENT_CANCELLED',
        'Appointment Cancelled',
        `${appt.patientName || 'Patient'}'s appointment on ${appt.bookingDate}${time} has been cancelled.`,
      );
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

        const time = appt.bookingTime ? ` at ${appt.bookingTime}` : '';
        const reasonSuffix = cancellationReason ? ` Reason: ${cancellationReason}` : '';
        await this.notifyDoctor(
          appt.doctorId,
          appt.clinicId ?? undefined,
          'APPOINTMENT_CANCELLED',
          status === AppointmentStatus.Absent ? 'Patient Marked Absent' : 'Appointment Cancelled',
          `${appt.patientName || 'Patient'}'s appointment on ${appt.bookingDate}${time} is ${status.toLowerCase()}.${reasonSuffix}`,
        );
      }
    } else if (status === AppointmentStatus.Completed || status === AppointmentStatus.Done) {
      if (appt.doctorId) {
        await this.notifyDoctor(
          appt.doctorId,
          appt.clinicId ?? undefined,
          'VISIT_COMPLETED',
          'Visit Completed',
          `Consultation for ${appt.patientName || 'Patient'} marked complete.`,
        );
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

    if (appt.doctorId) {
      const t = time ? ` at ${time}` : '';
      await this.notifyDoctor(
        appt.doctorId,
        appt.clinicId ?? undefined,
        'APPOINTMENT_REMINDER',
        'Appointment Rescheduled',
        `${appt.patientName || 'Patient'}'s appointment moved to ${date}${t}.`,
      );
    }
    return ok(undefined);
  }
}
