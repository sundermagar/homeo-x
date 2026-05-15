import { Result, ok, fail } from '../../../shared/result.js';
import type { ICommunicationRepository } from '../ports/communication.repository.js';
import type { PatientRepository } from '../../patient/ports/patient.repository.js';
import type { WhatsAppRepository } from '../../whatsapp/ports/whatsapp.repository.js';
import type { WhatsAppGateway as CloudGateway } from '../../whatsapp/ports/whatsapp-gateway.js';
import type {
  SendWhatsAppDto, BroadcastWhatsAppDto, SendWhatsAppResult
} from '@mmc/types';
import { createLogger } from '../../../shared/logger.js';

const logger = createLogger('send-whatsapp-use-case');

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

/**
 * SendWhatsAppUseCase — Meta Cloud API only.
 * Resolves the clinic's default active WABA channel from wa_channels,
 * sends via WhatsAppCloudGateway, and logs to the communication repo.
 * No BulkShooters. No deep links. Pure Meta.
 */
export class SendWhatsAppUseCase {
  constructor(
    private commRepo: ICommunicationRepository,
    private waRepo: WhatsAppRepository,
    private cloudGateway: CloudGateway,
    private patientRepo?: PatientRepository,
  ) {}

  async sendSingle(dto: SendWhatsAppDto): Promise<Result<SendWhatsAppResult>> {
    try {
      if (!dto.phone?.trim()) return fail('Phone number is required', 'VALIDATION');
      if (!dto.message?.trim()) return fail('Message is required', 'VALIDATION');

      const phone = dto.phone.replace(/\D/g, '');

      // Resolve default channel for this clinic
      const clinicId = dto.clinicId;
      const channel = clinicId ? await this.waRepo.findDefaultChannel(clinicId) : null;

      let channelId = channel?.id || null;

      if (!channel) {
        if (process.env.WHATSAPP_TOKEN) {
          logger.info(`No active WABA channel for clinic ${clinicId}, falling back to .env Meta credentials.`);
        } else {
          logger.warn(`No active WABA channel for clinic ${clinicId}. WhatsApp send skipped.`);
          return fail('No active WhatsApp channel configured. Please add a WABA channel or set WHATSAPP_TOKEN in .env.', 'NO_CHANNEL');
        }
      }

      const result = await this.cloudGateway.sendText(channelId, phone, dto.message);

      // Track in conversation
      try {
        let conv = await this.waRepo.findConversationByPhone(channel.id, phone);
        if (!conv) {
          conv = await this.waRepo.saveConversation({
            clinicId: channel.clinicId,
            channelId: channel.id,
            contactPhone: phone,
            status: 'open',
            lastMessageAt: new Date(),
            lastMessageText: dto.message.substring(0, 200),
          });
        } else {
          await this.waRepo.saveConversation({
            id: conv.id,
            lastMessageAt: new Date(),
            lastMessageText: dto.message.substring(0, 200),
          });
        }
        await this.waRepo.saveMessage({
          conversationId: conv.id,
          whatsappMessageId: result.messageId,
          direction: 'outbound',
          content: dto.message,
          type: 'text',
          status: result.success ? 'sent' : 'failed',
          timestamp: new Date(),
        });
      } catch (trackErr: any) {
        logger.warn(`Conversation tracking failed (non-critical): ${trackErr.message}`);
      }

      // Log to communication repo
      await this.commRepo.logWhatsApp({
        regid: dto.regid,
        phone: `91${phone}`,
        message: dto.message,
        status: result.success ? 'sent' : 'failed',
      });

      return ok({
        success: result.success,
        sent: result.success ? 1 : 0,
        failed: result.success ? 0 : 1,
        details: [{ phone: `91${phone}`, automated: true, messageId: result.messageId }],
      });
    } catch (err) {
      return fail(errMsg(err));
    }
  }

  async broadcast(dto: BroadcastWhatsAppDto): Promise<Result<SendWhatsAppResult>> {
    try {
      if (!dto.message?.trim()) return fail('Message is required', 'VALIDATION');

      const clinicId = dto.clinicId;
      const channel = clinicId ? await this.waRepo.findDefaultChannel(clinicId) : null;

      let channelId = channel?.id || null;
      if (!channel) {
        if (!process.env.WHATSAPP_TOKEN) {
          return fail('No active WhatsApp channel configured. Please add a WABA channel or set WHATSAPP_TOKEN in .env.', 'NO_CHANNEL');
        }
      }

      // Collect phones
      const phones: string[] = [];
      if (dto.phone?.length) {
        phones.push(...dto.phone.map((p: string) => p.replace(/\D/g, '')));
      }
      if (dto.patientIds?.length && this.patientRepo) {
        for (const id of dto.patientIds) {
          const p = await this.patientRepo.findById(id);
          if ((p as any)?.mobile1) phones.push((p as any).mobile1.replace(/\D/g, ''));
        }
      }

      if (!phones.length) return fail('No recipients found', 'VALIDATION');

      let sent = 0, failed = 0;
      const details: any[] = [];

      for (const phone of [...new Set(phones)]) {
        try {
          const result = await this.cloudGateway.sendText(channelId, phone, dto.message);

          await this.commRepo.logWhatsApp({
            phone: `91${phone}`,
            message: dto.message,
            status: result.success ? 'sent' : 'failed',
          });

          if (result.success) {
            details.push({ phone: `91${phone}`, automated: true, messageId: result.messageId });
            sent++;
          } else {
            failed++;
            logger.warn(`Failed to send to ${phone}: ${result.error}`);
          }
        } catch (err: any) {
          logger.warn(`Broadcast error for ${phone}: ${err.message}`);
          failed++;
        }
      }

      return ok({ success: true, sent, failed, details });
    } catch (err) {
      return fail(errMsg(err));
    }
  }
}
