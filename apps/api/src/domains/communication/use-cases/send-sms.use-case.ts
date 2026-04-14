import { Result, ok, fail } from '../../../shared/result.js';
import type { ICommunicationRepository } from '../ports/communication.repository.js';
import type {
  SendSmsDto, BroadcastSmsDto, SendSmsResult
} from '@mmc/types';
import type { AppointmentRepository } from '../../appointment/ports/appointment.repository.js';
import type { PatientRepository } from '../../patient/ports/patient.repository.js';

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

export class SendSmsUseCase {
  constructor(
    private commRepo: ICommunicationRepository,
    private apptRepo?: AppointmentRepository,
    private patientRepo?: PatientRepository,
  ) { }

  /**
   * Replace placeholders in message: {#name#}, {#date#}, {#clinic#}
   */
  private replacePlaceholders(
    message: string,
    vars: { name?: string; date?: string; clinic?: string }
  ): string {
    return message
      .replace(/{#name#}/gi, vars.name ?? 'Patient')
      .replace(/{#date#}/gi, vars.date ?? new Date().toLocaleDateString('en-IN'))
      .replace(/{#clinic#}/gi, vars.clinic ?? 'HomeoX');
  }

  /**
   * Send SMS to a single phone number.
   * In production this calls the SMS gateway (BulkShooters / MSG91 / Twilio).
   * Currently simulates send and logs to sms_reports.
   */
  async sendSingle(dto: SendSmsDto): Promise<Result<SendSmsResult>> {
    try {
      if (!dto.phone?.trim()) return fail('Phone number is required', 'VALIDATION');
      if (!dto.message?.trim()) return fail('Message is required', 'VALIDATION');

      const phone = dto.phone.replace(/\D/g, '');

      // TODO: Integrate real SMS gateway (e.g. BulkShooters API)
      // const gatewayRef = await smsGatewaySend(phone, dto.message);

      const report = await this.commRepo.logSms({
        regid: dto.regid ?? 0,
        phone,
        message: dto.message,
        smsType: dto.smsType ?? 'Normal',
        status: 'sent',
        gatewayRef: `mock-${Date.now()}`,
      });

      return ok({ success: true, sent: 1, failed: 0, gatewayRef: report.id.toString() });
    } catch (err) {
      return fail(errMsg(err));
    }
  }

  /**
   * Broadcast SMS to all patients of a doctor, or to a list of patientIds.
   * Replaces {#name#} per patient.
   */
  async broadcast(dto: BroadcastSmsDto): Promise<Result<SendSmsResult>> {
    try {
      if (!dto.message?.trim()) return fail('Message is required', 'VALIDATION');
      if (!dto.patientIds?.length) return fail('No patients specified', 'VALIDATION');

      let patients: Array<{ id: number; first_name?: string; surname?: string; mobile1?: string }> = [];

      if (this.patientRepo) {
        for (const id of dto.patientIds) {
          const p = await this.patientRepo.findById(id);
          if (p) patients.push(p as any);
        }
      }

      let sent = 0, failed = 0;
      for (const patient of patients) {
        const phone = patient.mobile1?.replace(/\D/g, '') ?? '';
        if (!phone) { failed++; continue; }

        const personalizedMsg = this.replacePlaceholders(dto.message, {
          name: `${patient.first_name ?? ''} ${patient.surname ?? ''}`.trim(),
          date: new Date().toLocaleDateString('en-IN'),
        });

        try {
          await this.commRepo.logSms({
            regid: patient.id,
            phone,
            message: personalizedMsg,
            smsType: dto.smsType ?? 'Group',
            status: 'sent',
            gatewayRef: `mock-${Date.now()}-${patient.id}`,
          });
          sent++;
        } catch {
          failed++;
        }
      }

      return ok({ success: true, sent, failed });
    } catch (err) {
      return fail(errMsg(err));
    }
  }
}
