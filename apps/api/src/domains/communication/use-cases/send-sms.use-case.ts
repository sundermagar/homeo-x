import { Result, ok, fail } from '../../../shared/result.js';
import type { ICommunicationRepository } from '../ports/communication.repository.js';
import type {
  SendSmsDto, BroadcastSmsDto, SendSmsResult
} from '@mmc/types';
import type { PatientRepository } from '../../patient/ports/patient.repository.js';
import type { SmsGateway } from '../ports/sms-gateway.js';

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

export class SendSmsUseCase {
  constructor(
    private commRepo: ICommunicationRepository,
    private smsGateway: SmsGateway,
    private patientRepo?: PatientRepository,
  ) { }

  // ── Placeholders ───────────────────────────────────────────────────────────

  private replacePlaceholders(
    message: string,
    vars: { name?: string; date?: string; clinic?: string; time?: string; doctor?: string; fee?: string }
  ): string {
    return message
      .replace(/{#name#}/gi,    vars.name    ?? 'Patient')
      .replace(/{#date#}/gi,     vars.date     ?? new Date().toLocaleDateString('en-IN'))
      .replace(/{#clinic#}/gi,   vars.clinic   ?? 'HomeoX Clinic')
      .replace(/{#time#}/gi,     vars.time     ?? '')
      .replace(/{#doctor#}/gi,   vars.doctor   ?? '')
      .replace(/{#fee#}/gi,      vars.fee      ?? '');
  }

  // ── Core send ─────────────────────────────────────────────────────────────

  /**
   * Send SMS to a single phone number.
   * Calls the configured SMS gateway and logs to sms_reports.
   */
  async sendSingle(dto: SendSmsDto): Promise<Result<SendSmsResult>> {
    try {
      if (!dto.phone?.trim()) return fail('Phone number is required', 'VALIDATION');
      if (!dto.message?.trim()) return fail('Message is required', 'VALIDATION');

      const phone = dto.phone.replace(/\D/g, '');
      const smsType = dto.smsType ?? 'General';

      const result = await this.smsGateway.send({ phone, message: dto.message });
      const status = result.status === 'failed' ? 'failed' : 'sent';
      const gatewayRef = result.messageId || `tx-${Date.now()}`;

      await this.commRepo.logSms({
        regid: dto.regid ?? 0,
        phone,
        message: dto.message,
        smsType,
        status,
        gatewayRef,
      });

      if (result.status === 'failed') {
        return fail(result.error ?? 'SMS send failed', 'GATEWAY_ERROR');
      }

      return ok({ success: true, sent: 1, failed: 0, gatewayRef });
    } catch (err) {
      return fail(errMsg(err));
    }
  }

  /**
   * Broadcast SMS to a list of patientIds.
   * Replaces {#name#}, {#date#} per patient.
   */
  async broadcast(dto: BroadcastSmsDto): Promise<Result<SendSmsResult>> {
    try {
      if (!dto.message?.trim()) return fail('Message is required', 'VALIDATION');
      if (!dto.patientIds?.length) return fail('No patients specified', 'VALIDATION');

      const patients: Array<{ id: number; first_name?: string; surname?: string; mobile1?: string }> = [];
      if (this.patientRepo) {
        for (const id of dto.patientIds) {
          const p = await this.patientRepo.findById(id);
          if (p) patients.push(p as any);
        }
      }

      const today = new Date().toLocaleDateString('en-IN');
      let sent = 0, failed = 0;

      for (const patient of patients) {
        const phone = patient.mobile1?.replace(/\D/g, '') ?? '';
        if (!phone) { failed++; continue; }

        const personalizedMsg = this.replacePlaceholders(dto.message, {
          name: `${patient.first_name ?? ''} ${patient.surname ?? ''}`.trim(),
          date: today,
        });

        try {
          const result = await this.smsGateway.send({ phone, message: personalizedMsg });
          const status = result.status === 'failed' ? 'failed' : 'sent';
          await this.commRepo.logSms({
            regid: patient.id,
            phone,
            message: personalizedMsg,
            smsType: dto.smsType ?? 'Group',
            status,
            gatewayRef: result.messageId || `tx-${Date.now()}-${patient.id}`,
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

  // ── Automation helpers (called by other use-cases / schedulers) ───────────

  /**
   * Appointment confirmation SMS.
   * Sent immediately after a booking is created.
   */
  async sendAppointmentConfirmation(params: {
    phone: string;
    patientName: string;
    date: string;
    time: string;
    doctorName?: string;
    clinicName?: string;
  }): Promise<Result<SendSmsResult>> {
    const template = `Dear {#name#}, your appointment at {#clinic#} is confirmed for {#date#} at {#time#}. Kindly arrive 10 minutes early. Regards, HomeoX Clinic.`;
    const message = this.replacePlaceholders(template, {
      name:   params.patientName,
      date:   params.date,
      time:   params.time,
      clinic: params.clinicName,
      doctor: params.doctorName,
    });
    return this.sendSingle({ phone: params.phone, message, smsType: 'Appointment' });
  }

  /**
   * Appointment reminder SMS.
   * Sent 24 hours before the visit.
   */
  async sendAppointmentReminder(params: {
    phone: string;
    patientName: string;
    date: string;
    time: string;
    doctorName?: string;
    clinicName?: string;
  }): Promise<Result<SendSmsResult>> {
    const template = `Dear {#name#}, a friendly reminder: your appointment at {#clinic#} is tomorrow ({#date#}) at {#time#}. Wishing you good health! - HomeoX Clinic`;
    const message = this.replacePlaceholders(template, {
      name:   params.patientName,
      date:   params.date,
      time:   params.time,
      clinic: params.clinicName,
      doctor: params.doctorName,
    });
    return this.sendSingle({ phone: params.phone, message, smsType: 'Reminder' });
  }

  /**
   * Birthday greeting SMS.
   */
  async sendBirthdayGreeting(params: {
    phone: string;
    patientName: string;
  }): Promise<Result<SendSmsResult>> {
    const template = `Happy Birthday, {#name#}! Wishing you a year filled with health, happiness, and peace. - HomeoX Clinic`;
    const message = this.replacePlaceholders(template, { name: params.patientName });
    return this.sendSingle({ phone: params.phone, message, smsType: 'Birthday' });
  }

  /**
   * Follow-up due reminder SMS.
   */
  async sendFollowupReminder(params: {
    phone: string;
    patientName: string;
    lastVisitDate: string;
  }): Promise<Result<SendSmsResult>> {
    const template = `Dear {#name#}, it's been a while since your last visit on {#date#}. We'd love to see you again for a follow-up. Please book an appointment at your convenience. - HomeoX Clinic`;
    const message = this.replacePlaceholders(template, {
      name: params.patientName,
      date: params.lastVisitDate,
    });
    return this.sendSingle({ phone: params.phone, message, smsType: 'Reminder' });
  }
}
