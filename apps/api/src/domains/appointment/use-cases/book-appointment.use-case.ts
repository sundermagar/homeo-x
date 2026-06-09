import type { AppointmentRepository } from '../ports/appointment.repository.js';
import type { PatientRepository } from '../../patient/ports/patient.repository.js';
import type { StaffRepository } from '../../staff/ports/staff.repository.js';
import type { CreateAppointmentDto } from '@mmc/types';
import { type Result, ok, fail } from '../../../shared/result.js';
import type { SendSmsUseCase } from '../../communication/use-cases/send-sms.use-case.js';
import type { SendWhatsAppTemplateUseCase } from '../../communication/use-cases/send-whatsapp-template.use-case.js';
import { triggerNotification } from '../../../infrastructure/http/notification-trigger.js';
import type { NotificationsRepository } from '../../communication/ports/notifications.repository.js';
import type { BillingRepository } from '../../billing/ports/billing.repository.js';

import { createLogger } from '../../../shared/logger.js';

const logger = createLogger('book-appointment');

export class BookAppointmentUseCase {
  constructor(
    private readonly repo: AppointmentRepository,
    private readonly sms?: SendSmsUseCase,
    private readonly patientRepo?: PatientRepository,
    private readonly notifRepo?: NotificationsRepository,
    private readonly whatsapp?: SendWhatsAppTemplateUseCase,
    private readonly billingRepo?: BillingRepository,
    private readonly staffRepo?: StaffRepository,
  ) { }

  private async resolveConsultationFee(dto: CreateAppointmentDto): Promise<number | undefined> {
    if (dto.doctorId && this.staffRepo) {
      const doctor = await this.staffRepo.findById('doctor', dto.doctorId);
      if (doctor?.consultationFee !== null && doctor?.consultationFee !== undefined) {
        return doctor.consultationFee;
      }
    }
    return dto.consultationFee;
  }

  async execute(dto: CreateAppointmentDto): Promise<Result<{ id: number; tokenNo?: number }>> {
    if (!dto.bookingDate) return fail('Booking date is required', 'VALIDATION');

    let patientId = dto.patientId;
    let unregisteredPatientId = dto.unregisteredPatientId;

    // Create unregistered patient if name provided but no patientId (quick-booking)
    if (!patientId && !unregisteredPatientId && dto.patientName && this.patientRepo) {
      const created = await this.patientRepo.createUnregistered({
        name: dto.patientName,
        phone: dto.phone,
        clinicId: dto.clinicId,
      });
      if (created) {
        unregisteredPatientId = created.id;
      }
    }

    const fee = await this.resolveConsultationFee(dto);
    const createDto = { ...dto, consultationFee: fee };
    const id = await this.repo.create({ ...createDto, patientId, unregisteredPatientId });

    let tokenNo: number | undefined;
    const todayStr = new Date().toLocaleDateString('en-CA');
    if (dto.bookingDate === todayStr) {
      try {
        tokenNo = await this.repo.issueToken(id);
        if (this.repo.addToWaitlist) {
          await this.repo.addToWaitlist({
            patientId: patientId || undefined,
            appointmentId: id,
            doctorId: dto.doctorId,
            consultationFee: fee,
            clinicId: dto.clinicId
          });
        }
      } catch (err) {
        logger.warn(`Failed to auto-issue token for appointment ${id}: ${err}`);
      }
    }

    // DECOMMISSIONED: SMS session moved to WhatsApp
    /*
    if (this.sms && dto.phone && dto.patientName) {
      this.sms.sendAppointmentConfirmation({
        phone: dto.phone,
        patientName: dto.patientName,
        date: dto.bookingDate,
        time: dto.bookingTime ?? '',
        clinicName: 'MMC Clinic'
      }).catch(() => {});
    }
    */

    if (this.whatsapp && dto.phone && dto.patientName && dto.clinicId) {
      // Find the first active WhatsApp channel for this clinic
      this.whatsapp.sendAppointmentConfirmation({
        clinicId: dto.clinicId,
        phone: dto.phone,
        patientName: dto.patientName,
        date: dto.bookingDate,
        time: dto.bookingTime ?? '',
        clinicName: 'MMC Clinic'
      }).catch(err => logger.warn(`WhatsApp confirmation skipped: ${err.message}`));
    }

    if (this.notifRepo && dto.doctorId) {
      // Doctors row id may not align with users row id for legacy data — resolve to a real user id.
      const resolvedUserId = this.notifRepo.resolveUserIdForDoctor
        ? await this.notifRepo.resolveUserIdForDoctor(dto.doctorId)
        : dto.doctorId;

      if (resolvedUserId) {
        const patientNameDisplay = dto.patientName || 'New Patient';
        const timeDisplay = dto.bookingTime ? ` at ${dto.bookingTime}` : '';

        await triggerNotification({
          userId: resolvedUserId,
          clinicId: dto.clinicId,
          type: 'APPOINTMENT_REMINDER',
          title: 'New Appointment Booked',
          message: `${patientNameDisplay} has booked an appointment for ${dto.bookingDate}${timeDisplay}.`,
          repo: this.notifRepo,
        });
      }
    }

    if (this.billingRepo && fee && fee > 0) {
      try {
        const billRegid = patientId || unregisteredPatientId;
        if (billRegid) {
          const billNo = await this.billingRepo.nextBillNo();
          await this.billingRepo.create({
            regid: billRegid,
            billNo,
            billDate: dto.bookingDate,
            charges: fee,
            received: 0,
            paymentMode: 'Cash', // Default until paid
            billType: 'Consultation',
            doctorId: dto.doctorId,
          });
        }
      } catch (err) {
        logger.error(`Failed to auto-generate bill for appointment ${id}: ${err}`);
      }
    }

    return ok({ id, tokenNo });
  }
}
