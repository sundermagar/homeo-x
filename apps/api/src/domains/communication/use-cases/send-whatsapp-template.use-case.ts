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

        let templateBody = '';
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

        // If DB also didn't have the template, build a human-readable message from the component parameters
        if (!templateBody) {
          const bodyComponent = options.components?.find((c: any) => c.type === 'body');
          const params = bodyComponent?.parameters?.map((p: any) => p.text || p.value || '') || [];
          
          // Build a generic but informative message from the available parameters
          const paramLines = params.filter((p: string) => p.length > 0);
          if (paramLines.length > 0) {
            templateBody = `📋 *${options.templateName.replace(/_/g, ' ').toUpperCase()}*\n\n${paramLines.join('\n')}`;
          } else {
            templateBody = `Notification: ${options.templateName.replace(/_/g, ' ')}`;
          }
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
  // Sends a well-formatted WhatsApp text message with appointment details and vitals link.
  // NOTE: When a Meta-approved template 'appointment_confirmation_v2' is available,
  // this can be switched back to this.execute() with template components.
  async sendAppointmentConfirmation(options: {
    clinicId: number;
    phone: string;
    patientName: string;
    date: string;
    time: string;
    clinicName: string;
    vitalsLink?: string;
  }) {
    let channelId: number | undefined;
    if (options.clinicId) {
      const defaultChannel = await this.waRepo.findDefaultChannel(options.clinicId);
      if (defaultChannel) channelId = defaultChannel.id;
    }
    if (!channelId) {
      return { success: false, error: 'No WhatsApp channel found for this clinic' };
    }

    const lines = [
      `🏥 *Appointment Confirmed!*`,
      ``,
      `Dear *${options.patientName}*,`,
      ``,
      `Your appointment has been successfully booked:`,
      `📅 *Date:* ${options.date}`,
      `🕐 *Time:* ${options.time}`,
      `🏨 *Clinic:* ${options.clinicName}`,
    ];

    if (options.vitalsLink) {
      lines.push(
        ``,
        `📋 *Please submit your vitals before the appointment:*`,
        `${options.vitalsLink}`,
      );
    }

    lines.push(
      ``,
      `Thank you for choosing ${options.clinicName}! 🙏`,
    );

    const message = lines.join('\n');
    logger.info(`Sending appointment confirmation text to ${options.phone}`);

    const result = await this.gateway.sendText(channelId, options.phone, message);

    if (result.success) {
      // Save conversation and message record
      let conversation = await this.waRepo.findConversationByPhone(channelId, options.phone);
      if (!conversation) {
        const channel = await this.waRepo.findChannelById(channelId);
        conversation = await this.waRepo.saveConversation({
          clinicId: channel?.clinicId,
          channelId: channelId,
          contactPhone: options.phone,
          status: 'open',
          lastMessageAt: new Date(),
          lastMessageText: 'Appointment Confirmation',
        });
      }

      await this.waRepo.saveMessage({
        conversationId: conversation.id,
        whatsappMessageId: result.messageId,
        direction: 'outbound',
        content: message,
        type: 'text',
        status: 'sent',
        timestamp: new Date(),
      });
    }

    return result;
  }

  // Convenience method for appointment reminders (sent via cron job 24h before)
  async sendAppointmentReminder(options: {
    clinicId: number;
    phone: string;
    patientName: string;
    date: string;
    time: string;
    clinicName: string;
  }) {
    let channelId: number | undefined;
    if (options.clinicId) {
      const defaultChannel = await this.waRepo.findDefaultChannel(options.clinicId);
      if (defaultChannel) channelId = defaultChannel.id;
    }
    if (!channelId) {
      return { success: false, error: 'No WhatsApp channel found for this clinic' };
    }

    const lines = [
      `⏰ *Friendly Reminder from ${options.clinicName}*`,
      ``,
      `Dear *${options.patientName}*,`,
      ``,
      `This is a reminder for your upcoming appointment tomorrow:`,
      `📅 *Date:* ${options.date}`,
      `🕐 *Time:* ${options.time}`,
      ``,
      `Please let us know if you need to reschedule. See you soon! 🙏`,
    ];

    const message = lines.join('\n');
    logger.info(`Sending appointment reminder text to ${options.phone}`);

    const result = await this.gateway.sendText(channelId, options.phone, message);

    if (result.success) {
      let conversation = await this.waRepo.findConversationByPhone(channelId, options.phone);
      if (!conversation) {
        const channel = await this.waRepo.findChannelById(channelId);
        conversation = await this.waRepo.saveConversation({
          clinicId: channel?.clinicId,
          channelId: channelId,
          contactPhone: options.phone,
          status: 'open',
          lastMessageAt: new Date(),
          lastMessageText: 'Appointment Reminder',
        });
      }

      await this.waRepo.saveMessage({
        conversationId: conversation.id,
        whatsappMessageId: result.messageId,
        direction: 'outbound',
        content: message,
        type: 'text',
        status: 'sent',
        timestamp: new Date(),
      });
    }

    return result;
  }

  // Convenience method for daily medicine reminders
  // Pushes a daily reminder notification to patients with active prescriptions
  async sendMedicineReminder(options: {
    clinicId: number;
    phone: string;
    patientName: string;
    medicines: string[];
    clinicName: string;
  }) {
    let channelId: number | undefined;
    if (options.clinicId) {
      const defaultChannel = await this.waRepo.findDefaultChannel(options.clinicId);
      if (defaultChannel) channelId = defaultChannel.id;
    }
    if (!channelId) {
      return { success: false, error: 'No WhatsApp channel found for this clinic' };
    }

    const lines = [
      `🔔 *MMC Clinic Reminder*`,
      ``,
      `Hi *${options.patientName}*, time for your homeopathic remedies:`,
    ];

    options.medicines.forEach(med => {
      // Just keep the remedy name to keep it short if we want, or keep the full string.
      // The options.medicines already has the formatted string.
      lines.push(`• ${med}`);
    });

    lines.push(
      ``,
      `Stay healthy! 🙏`
    );

    const message = lines.join('\n');
    logger.info(`Sending medicine reminder to ${options.phone}`);

    const result = await this.gateway.sendText(channelId, options.phone, message);

    if (result.success) {
      let conversation = await this.waRepo.findConversationByPhone(channelId, options.phone);
      if (!conversation) {
        const channel = await this.waRepo.findChannelById(channelId);
        conversation = await this.waRepo.saveConversation({
          clinicId: channel?.clinicId,
          channelId: channelId,
          contactPhone: options.phone,
          status: 'open',
          lastMessageAt: new Date(),
          lastMessageText: 'Medicine Reminder',
        });
      }

      await this.waRepo.saveMessage({
        conversationId: conversation.id,
        whatsappMessageId: result.messageId,
        direction: 'outbound',
        content: message,
        type: 'text',
        status: 'sent',
        timestamp: new Date(),
      });
    }

    return result;
  }
}
