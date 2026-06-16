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

  private resolveConsultationFee(dto: CreateAppointmentDto, doctor?: any): number | undefined {
    if (dto.consultationFee !== undefined && dto.consultationFee !== null) {
      return Number(dto.consultationFee);
    }
    if (doctor?.consultationFee !== null && doctor?.consultationFee !== undefined) {
      return Number(doctor.consultationFee);
    }
    return undefined;
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

    let doctor: any = undefined;
    if (dto.doctorId && this.staffRepo) {
      doctor = await this.staffRepo.findById('doctor', dto.doctorId);
      if (!doctor) return fail('Doctor not found', 'NOT_FOUND');
      
      // Strict inactive check
      if (doctor.isActive === false) {
        return fail('Cannot book an appointment for an inactive doctor.', 'VALIDATION');
      }
    }

    const fee = this.resolveConsultationFee(dto, doctor);
    const createDto = { ...dto, consultationFee: fee };
    const id = await this.repo.create({ ...createDto, patientId, unregisteredPatientId });

    let tokenNo: number | undefined;
    const todayStr = new Date().toLocaleDateString('en-CA');
    
    // Normalize bookingDate to YYYY-MM-DD for comparison
    let normalizedBookingDate = dto.bookingDate;
    if (normalizedBookingDate.includes('/')) {
      const [d, m, y] = normalizedBookingDate.split('/');
      if (d && m && y && y.length === 4) {
        normalizedBookingDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    } else if (normalizedBookingDate.includes('-')) {
      const [d, m, y] = normalizedBookingDate.split('-');
      if (d && m && y && d.length !== 4) {
        normalizedBookingDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    }

    if (normalizedBookingDate === todayStr) {
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

    if (this.billingRepo && fee !== undefined && fee >= 0) {
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
