import { Result, ok, fail } from '../../../shared/result.js';
import type { ICommunicationRepository } from '../ports/communication.repository.js';
import type { PatientRepository } from '../../patient/ports/patient.repository.js';
import type {
  SendWhatsAppDto, BroadcastWhatsAppDto, SendWhatsAppResult
} from '@mmc/types';

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

export class SendWhatsAppUseCase {
  constructor(
    private commRepo: ICommunicationRepository,
    private patientRepo?: PatientRepository,
  ) {}

  /**
   * Build WhatsApp deep link URL.
   * In production, replace with WhatsApp Business API (Meta Graph API / BulkShooters).
   */
  private buildDeepLink(phone: string, message: string): string {
    const clean = phone.replace(/\D/g, '');
    const encoded = encodeURIComponent(message);
    return `https://api.whatsapp.com/send?phone=91${clean}&text=${encoded}`;
  }

  async sendSingle(dto: SendWhatsAppDto): Promise<Result<SendWhatsAppResult>> {
    try {
      if (!dto.phone?.trim()) return fail('Phone number is required', 'VALIDATION');
      if (!dto.message?.trim()) return fail('Message is required', 'VALIDATION');

      const phone = dto.phone.replace(/\D/g, '');
      const deepLink = this.buildDeepLink(phone, dto.message);

      await this.commRepo.logWhatsApp({
        regid:    dto.regid,
        phone:    `91${phone}`,
        message:  dto.message,
        deepLink,
        status:   'sent',
      });

      return ok({ success: true, sent: 1, failed: 0, details: [{ phone: `91${phone}`, deepLink }] });
    } catch (err) {
      return fail(errMsg(err));
    }
  }

  async broadcast(dto: BroadcastWhatsAppDto): Promise<Result<SendWhatsAppResult>> {
    try {
      if (!dto.message?.trim()) return fail('Message is required', 'VALIDATION');

      const phones: string[] = [];
      if (dto.phone?.length) {
        phones.push(...dto.phone.map(p => p.replace(/\D/g, '')));
      }
      if (dto.patientIds?.length && this.patientRepo) {
        for (const id of dto.patientIds) {
          const p = await this.patientRepo.findById(id);
          if ((p as any)?.mobile1) phones.push((p as any).mobile1.replace(/\D/g, ''));
        }
      }

      if (!phones.length) return fail('No recipients found', 'VALIDATION');

      let sent = 0, failed = 0;
      const details: Array<{ phone: string; deepLink: string }> = [];

      for (const phone of [...new Set(phones)]) {
        try {
          const deepLink = this.buildDeepLink(phone, dto.message);
          await this.commRepo.logWhatsApp({
            phone: `91${phone}`,
            message: dto.message,
            deepLink,
            status: 'sent',
          });
          details.push({ phone: `91${phone}`, deepLink });
          sent++;
        } catch {
          failed++;
        }
      }

      return ok({ success: true, sent, failed, details });
    } catch (err) {
      return fail(errMsg(err));
    }
  }
}
