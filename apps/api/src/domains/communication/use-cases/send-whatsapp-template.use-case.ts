import { createLogger } from '../../../shared/logger.js';
import type { WhatsAppGateway } from '../../whatsapp/ports/whatsapp-gateway.js';
import type { WhatsAppRepository } from '../../whatsapp/ports/whatsapp.repository.js';

const logger = createLogger('send-whatsapp-template-use-case');

export interface WhatsAppTemplateOptions {
  channelId?: number;
  clinicId?: number;
  phone: string;
  templateName: string;
  language: string;
  components: any[];
}

export class SendWhatsAppTemplateUseCase {
  constructor(
    private readonly gateway: WhatsAppGateway,
    private readonly waRepo: WhatsAppRepository,
  ) {}

  async execute(options: WhatsAppTemplateOptions): Promise<{ success: boolean; error?: string }> {
    try {
      let channelId = options.channelId;

      if (!channelId && options.clinicId) {
        const defaultChannel = await this.waRepo.findDefaultChannel(options.clinicId);
        if (!defaultChannel)
          throw new Error(`No active WhatsApp channel found for clinic ${options.clinicId}`);
        channelId = defaultChannel.id;
      }

      if (!channelId) throw new Error('Channel ID or Clinic ID is required');

      let result = await this.gateway.sendTemplate(
        channelId,
        options.phone,
        options.templateName,
        options.language,
        options.components,
      );

      // If the template does not exist on Meta WABA, fall back to sending it as a direct text message
      if (
        !result.success &&
        (result.error?.includes('132001') ||
          result.error?.toLowerCase().includes('not exist') ||
          result.error?.toLowerCase().includes('translation'))
      ) {
        logger.info(
          `Template "${options.templateName}" not found on Meta. Interpolating database body and falling back to sendText...`,
        );

        let templateBody = `Template: ${options.templateName}`;
        try {
          const { eq, and } = await import('drizzle-orm');
          const { waTemplates } = await import('@mmc/database');

          const templateRows = await (this.waRepo as any).db
            .select()
            .from(waTemplates)
            .where(
              and(eq(waTemplates.name, options.templateName), eq(waTemplates.channelId, channelId)),
            )
            .limit(1);

          if (templateRows.length > 0 && templateRows[0].body) {
            templateBody = templateRows[0].body;

            // Interpolate components (e.g. {{1}}, {{2}} with text values)
            const bodyComponent = options.components?.find((c: any) => c.type === 'body');
            if (bodyComponent?.parameters) {
              bodyComponent.parameters.forEach((param: any, idx: number) => {
                const val = param.text || param.value || '';
                const placeholder = `{{${idx + 1}}}`;
                templateBody = templateBody.split(placeholder).join(val);
              });
            }
          }
        } catch (dbErr: any) {
          logger.warn(`Failed to retrieve or interpolate template from DB: ${dbErr.message}`);
        }

        logger.info(`Sending fallback text message: "${templateBody.substring(0, 100)}..."`);
        result = await this.gateway.sendText(channelId, options.phone, templateBody);
      }

      if (result.success) {
        // Find or create conversation
        let conversation = await this.waRepo.findConversationByPhone(channelId, options.phone);
        if (!conversation) {
          const channel = await this.waRepo.findChannelById(channelId);
          conversation = await this.waRepo.saveConversation({
            clinicId: channel?.clinicId,
            channelId: channelId,
            contactPhone: options.phone,
            status: 'open',
            lastMessageAt: new Date(),
            lastMessageText: `Template: ${options.templateName}`,
          });
        }

        // Save outbound message
        await this.waRepo.saveMessage({
          conversationId: conversation.id,
          whatsappMessageId: result.messageId,
          direction: 'outbound',
          content: `Template: ${options.templateName}`,
          type: 'template',
          status: 'sent',
          timestamp: new Date(),
        });
      }

      return result;
    } catch (err: any) {
      logger.error(`Failed to send WhatsApp template: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  // Convenience method for appointment confirmations
  async sendAppointmentConfirmation(options: {
    clinicId: number;
    phone: string;
    patientName: string;
    date: string;
    time: string;
    clinicName: string;
  }) {
    return this.execute({
      clinicId: options.clinicId,
      phone: options.phone,
      templateName: 'appointment_confirmation_v2', // Meta-approved template name
      language: 'en_US',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: options.patientName },
            { type: 'text', text: options.date },
            { type: 'text', text: options.time },
            { type: 'text', text: options.clinicName },
          ],
        },
      ],
    });
  }
}
