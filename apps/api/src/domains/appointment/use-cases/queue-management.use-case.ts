import type { AppointmentRepository } from '../ports/appointment.repository.js';
import type { WaitlistEntry } from '@mmc/types';
import { type Result, ok } from '../../../shared/result.js';
import type { NotificationsRepository } from '../../communication/ports/notifications.repository.js';
import type { BillingRepository } from '../../billing/ports/billing.repository.js';
import type { NotificationType } from '@mmc/types';
import { triggerNotification } from '../../../infrastructure/http/notification-trigger.js';

export class QueueManagementUseCase {
  constructor(
    private readonly repo: AppointmentRepository,
    private readonly notifRepo?: NotificationsRepository,
    private readonly billingRepo?: BillingRepository,
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

  async getWaitlist(
    date: string,
    doctorId?: number,
    clinicId?: number,
    patientId?: number,
    patientRegId?: number,
  ): Promise<Result<WaitlistEntry[]>> {
    const list = await this.repo.getWaitlist(date, doctorId, clinicId, patientId, patientRegId);
    return ok(list);
  }

  async addToWaitlist(dto: {
    patientId?: number;
    appointmentId?: number;
    unregisteredPatientId?: number;
    doctorId?: number;
    consultationFee?: number;
    clinicId?: number;
  }): Promise<Result<{ waitingNumber: number }>> {
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

  private async createConsultationBill(waitlistEntry: WaitlistEntry): Promise<void> {
    if (!this.billingRepo) return;

    const regid = waitlistEntry.patientId ?? waitlistEntry.unregisteredPatientId;
    const fee = Number(waitlistEntry.consultationFee ?? 0);
    if (!regid || fee <= 0) return;

    const billDate = new Date().toISOString().split('T')[0];
    const patientBills = await this.billingRepo.findByRegid(regid);
    const alreadyBilled = patientBills.bills.some((bill) =>
      bill.billType === 'Consultation'
      && bill.doctorId === waitlistEntry.doctorId
      && bill.charges === fee
      && bill.billDate === billDate
    );

    if (alreadyBilled) return;

    const billNo = await this.billingRepo.nextBillNo();
    await this.billingRepo.create({
      regid,
      billNo,
      billDate,
      charges: fee,
      received: 0,
      paymentMode: 'Cash',
      billType: 'Consultation',
      doctorId: waitlistEntry.doctorId ?? undefined,
    });
  }

  async completeVisit(waitlistId: number): Promise<Result<void>> {
    const waitlistEntry = await this.repo.findWaitlistEntryById(waitlistId);

    await this.notifyDoctorForWaitlist(
      waitlistId,
      'VISIT_COMPLETED',
      'Visit Completed',
      ({ patientName }) => `Consultation for ${patientName} marked complete.`,
    );
    await this.repo.completeWaitlistEntry(waitlistId);

    if (waitlistEntry) {
      try {
        await this.createConsultationBill(waitlistEntry);
      } catch (err: any) {
        // non-fatal: complete the visit even if auto-billing fails
        console.warn('[QueueManagementUseCase] Failed to generate consultation bill on completion:', err?.message || err);
      }
    }

    return ok(undefined);
  }

  async skipWaitlist(waitlistId: number): Promise<Result<void>> {
    await this.repo.skipWaitlistEntry(waitlistId);
    return ok(undefined);
  }
}
