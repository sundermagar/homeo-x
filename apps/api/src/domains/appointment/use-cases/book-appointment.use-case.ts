import type { AppointmentRepository } from '../ports/appointment.repository.js';
import type { PatientRepository } from '../../patient/ports/patient.repository.js';
import type { CreateAppointmentDto } from '@mmc/types';
import { type Result, ok, fail } from '../../../shared/result.js';
import type { SendSmsUseCase } from '../../communication/use-cases/send-sms.use-case.js';
import { triggerNotification } from '../../../infrastructure/http/notification-trigger.js';
import type { NotificationsRepository } from '../../communication/ports/notifications.repository.js';

export class BookAppointmentUseCase {
  constructor(
    private readonly repo: AppointmentRepository,
    private readonly sms?: SendSmsUseCase,
    private readonly patientRepo?: PatientRepository,
    private readonly notifRepo?: NotificationsRepository,
  ) {}

  async execute(dto: CreateAppointmentDto): Promise<Result<{ id: number }>> {
    if (!dto.bookingDate) return fail('Booking date is required', 'VALIDATION');

    let patientId = dto.patientId;

    // Auto-create patient if name/phone provided but no patientId (walk-in scenario)
    if (!patientId && dto.patientName && dto.phone && this.patientRepo) {
      const phoneOrMobile = dto.phone.trim();
      const nameParts = dto.patientName.trim().split(/\s+/);
      const firstName = nameParts[0] || dto.patientName.trim();
      const surname = nameParts.slice(1).join(' ') || 'Patient';

      const created = await this.patientRepo.create({
        firstName,
        surname,
        phone: phoneOrMobile,
        mobile1: phoneOrMobile,
        gender: 'M',
      } as any);

      if (created) {
        patientId = created.regid;
      }
    }

    const id = await this.repo.create({ ...dto, patientId });

    if (this.sms && dto.phone && dto.patientName) {
      this.sms.sendAppointmentConfirmation({
        phone: dto.phone,
        patientName: dto.patientName,
        date: dto.bookingDate,
        time: dto.bookingTime ?? '',
        clinicName: 'Kreed.health Clinic'
      }).catch(() => {});
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

    return ok({ id });
  }
}
