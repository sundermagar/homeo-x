import type { AppointmentRepository } from '../ports/appointment.repository.js';
import type { WaitlistEntry } from '@mmc/types';
import { type Result, ok } from '../../../shared/result.js';
import type { NotificationsRepository } from '../../communication/ports/notifications.repository.js';
import type { NotificationType } from '@mmc/types';
import { triggerNotification } from '../../../infrastructure/http/notification-trigger.js';

export class QueueManagementUseCase {
  constructor(
    private readonly repo: AppointmentRepository,
    private readonly notifRepo?: NotificationsRepository,
  ) {}

  private async notifyDoctorForWaitlist(
    waitlistId: number,
    type: NotificationType,
    title: string,
    composeMessage: (ctx: { patientName: string; bookingTime: string | null }) => string,
    clinicId?: number,
  ): Promise<void> {
    if (!this.notifRepo?.getWaitlistContext || !this.notifRepo.resolveUserIdForDoctor) return;
    const ctx = await this.notifRepo.getWaitlistContext(waitlistId);
    if (!ctx?.doctorId) return;
    const userId = await this.notifRepo.resolveUserIdForDoctor(ctx.doctorId);
    if (!userId) return;
    const message = composeMessage({
      patientName: ctx.patientName ?? 'Patient',
      bookingTime: ctx.bookingTime,
    });
    await triggerNotification({ userId, clinicId, type, title, message, repo: this.notifRepo });
  }

  async getWaitlist(date: string, doctorId?: number, clinicId?: number): Promise<Result<WaitlistEntry[]>> {
    const list = await this.repo.getWaitlist(date, doctorId, clinicId);
    return ok(list);
  }

  async addToWaitlist(dto: { patientId?: number; appointmentId?: number; unregisteredPatientId?: number; doctorId?: number; consultationFee?: number; clinicId?: number }): Promise<Result<{ waitingNumber: number }>> {
    const waitingNumber = await this.repo.addToWaitlist(dto);

    if (this.notifRepo && dto.doctorId) {
      const userId = this.notifRepo.resolveUserIdForDoctor
        ? await this.notifRepo.resolveUserIdForDoctor(dto.doctorId)
        : dto.doctorId;
      if (userId) {
        await triggerNotification({
          userId,
          clinicId: dto.clinicId,
          type: 'WAITLIST_OFFER',
          title: 'Patient Added to Waitlist',
          message: `A patient is now waiting (#${waitingNumber}).`,
          repo: this.notifRepo,
        });
      }
    }
    return ok({ waitingNumber });
  }

  async callNext(waitlistId: number): Promise<Result<void>> {
    await this.repo.callNextInWaitlist(waitlistId);
    await this.notifyDoctorForWaitlist(
      waitlistId,
      'QUEUE_CALLED',
      'Next Patient Called In',
      ({ patientName }) => `${patientName} has been called in for consultation.`,
    );
    return ok(undefined);
  }

  async completeVisit(waitlistId: number): Promise<Result<void>> {
    await this.notifyDoctorForWaitlist(
      waitlistId,
      'VISIT_COMPLETED',
      'Visit Completed',
      ({ patientName }) => `Consultation for ${patientName} marked complete.`,
    );
    await this.repo.completeWaitlistEntry(waitlistId);
    return ok(undefined);
  }

  async skipWaitlist(waitlistId: number): Promise<Result<void>> {
    await this.repo.skipWaitlistEntry(waitlistId);
    return ok(undefined);
  }
}
