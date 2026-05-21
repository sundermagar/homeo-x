import { createLogger } from '../../../shared/logger.js';
import type { WhatsAppRepository } from '../ports/whatsapp.repository.js';
import type { NotificationsRepository } from '../../../domains/communication/ports/notifications.repository.js';
import { triggerNotificationToRoles } from '../../../infrastructure/http/notification-trigger.js';
import { ExecuteAutomationUseCase } from './execute-automation.use-case.js';
import { getWhatsAppGateway } from '../../../infrastructure/http/gateways/whatsapp.gateway.js';

const logger = createLogger('handle-webhook-use-case');

export class HandleWebhookUseCase {
  private readonly socketGateway = getWhatsAppGateway();
  constructor(
    private readonly waRepo: WhatsAppRepository,
    private readonly gateway?: any, // WhatsAppCloudGateway
    private readonly notificationsRepo?: NotificationsRepository
  ) {}

  async execute(body: any): Promise<void> {
    if (body.object !== 'whatsapp_business_account') {
      logger.warn('Received webhook with invalid object type');
      return;
    }

    for (const entry of body.entry) {
      for (const change of entry.changes) {
        const value = change.value;
        const field = change.field;

        if (field === 'messages') {
          // Handle incoming messages
          if (value.messages) {
            for (const message of value.messages) {
              try {
                await this.handleIncomingMessage(value.metadata.phone_number_id, message);
              } catch (err: any) {
                logger.error(`Error handling incoming message: ${err.message}`);
              }
            }
          }

          // Handle message status updates
          if (value.statuses) {
            for (const status of value.statuses) {
              try {
                await this.handleStatusUpdate(status);
              } catch (err: any) {
                logger.error(`Error handling status update: ${err.message}`);
              }
            }
          }
        }
      }
    }
  }

  private async handleIncomingMessage(phoneNumberId: string, message: any) {
    // Deduplicate: Meta delivers webhooks with at-least-once guarantee.
    // Check if we already processed this message to avoid duplicate entries and incorrect conversation count increments.
    const existingMsg = await this.waRepo.findMessageByWhatsappId(message.id);
    if (existingMsg) {
      logger.info(`Skipping duplicate webhook for message ${message.id} (already in DB as id=${existingMsg.id})`);
      return;
    }

    const channel = await this.waRepo.findChannelByPhoneNumberId(phoneNumberId);
    if (!channel) {
      logger.warn(`No channel found for phone number ID: ${phoneNumberId}`);
      return;
    }

    const phone = message.from;
    let conversation = await this.waRepo.findConversationByPhone(channel.id, phone);

    const content = this.getMessageContent(message);
    const preview = content.length > 200 ? content.substring(0, 200) : content;

    if (!conversation) {
      conversation = await this.waRepo.saveConversation({
        clinicId: channel.clinicId,
        channelId: channel.id,
        contactPhone: phone,
        status: 'open',
        lastMessageAt: new Date(),
        lastIncomingMessageAt: new Date(),
        lastMessageText: preview,
        unreadCount: 1,
      });
    } else {
      await this.waRepo.saveConversation({
        id: conversation.id,
        lastMessageAt: new Date(),
        lastIncomingMessageAt: new Date(),
        lastMessageText: preview,
        unreadCount: (conversation.unreadCount || 0) + 1,
      });
    }

    const savedMessage = await this.waRepo.saveMessage({
      conversationId: conversation.id,
      whatsappMessageId: message.id,
      direction: 'inbound',
      content: content,
      type: message.type,
      status: 'received',
      timestamp: new Date(parseInt(message.timestamp) * 1000),
      metadata: message,
    });

    // ─── Real-time Emission ──────────────────────────────────────────────────
    if (this.socketGateway) {
      this.socketGateway.emitMessage(channel.id, conversation.id, savedMessage);
    }

    // ─── In-App Notification ─────────────────────────────────────────────────
    if (this.notificationsRepo) {
      const notifTitle = `New WhatsApp from +${phone}`;
      const notifMessage = content.length > 100 ? content.substring(0, 100) + '…' : content;
      triggerNotificationToRoles({
        roles: ['doctor', 'medical practitioner', 'admin', 'superadmin', 'clinicadmin', 'receptionist', 'account', 'employee', 'staff'],
        clinicId: channel.clinicId,
        type: 'WHATSAPP',
        title: notifTitle,
        message: notifMessage,
        repo: this.notificationsRepo,
      }).catch((err: any) => {
        logger.error(`[Notification] Failed to broadcast WhatsApp notification: ${err.message}`);
      });
    }

    // ─── Trigger Automations ──────────────────────────────────────────────────
    let automationTriggered = false;
    if (message.type === 'text') {
      const incomingText = (message.text?.body || '').toLowerCase().trim();
      const result = await this.waRepo.listAutomations(channel.clinicId);
      const automations = result.data;
      
      const matchedAutomation = automations.find((a: any) => {
        if (a.status !== 'active' || a.trigger !== 'keyword') return false;
        const config = a.triggerConfig as any;
        const keywords = Array.isArray(config?.keywords) ? config.keywords : [config?.keyword];
        return keywords.some((k: string) => k?.toLowerCase().trim() === incomingText);
      });

      if (matchedAutomation && this.gateway) {
        logger.info(`Triggering keyword automation ${matchedAutomation.id} for message: ${incomingText}`);
        const executeUseCase = new ExecuteAutomationUseCase(this.waRepo, this.gateway);
        await executeUseCase.execute(matchedAutomation.id, conversation.id, message);
        automationTriggered = true;
      }
    }

    // ─── AI Auto-Reply fallback (only if no keyword automation matched) ─────────
    if (!automationTriggered && message.type === 'text' && content && this.gateway) {
      import('../services/ai-auto-reply.service.js')
        .then(({ AiAutoReplyService }) => {
          const aiAutoReply = new AiAutoReplyService(this.waRepo!, this.gateway!);
          aiAutoReply.execute(channel, conversation!, content, phone).catch((aiErr: any) => {
            logger.error(`[AI AutoReply] Background execution error: ${aiErr.message}`);
          });
        })
        .catch((importErr) => {
          logger.error(`[AI AutoReply] Failed to import service: ${importErr.message}`);
        });
    }

    logger.info(`Processed incoming message from ${phone} in channel ${channel.id}`);
  }

  private async handleStatusUpdate(status: any) {
    const messageId = status.id;
    const currentStatus = status.status;
    
    // Update recipient status if part of a campaign
    await this.waRepo.updateRecipientStatus(messageId, currentStatus, {
      error: status.errors?.[0]
    });

    // Update message status in conversations
    const message = await this.waRepo.findMessageByWhatsappId(messageId);
    if (message) {
      const updateData: any = { 
        status: currentStatus, 
        updatedAt: new Date() 
      };
      if (currentStatus === 'delivered') updateData.deliveredAt = new Date();
      if (currentStatus === 'read') updateData.readAt = new Date();
      if (status.errors) {
        updateData.errorCode = status.errors[0].code;
        updateData.errorMessage = status.errors[0].message;
      }
      
      await this.waRepo.saveMessage({
        id: message.id,
        ...updateData
      });

      // ─── Real-time Status Update ───────────────────────────────────────────
      if (this.socketGateway) {
        this.socketGateway.emitStatus(message.conversationId, messageId, currentStatus);
      }
    }

    logger.info(`Updated status for message ${messageId} to ${currentStatus}`);
  }

  private getMessageContent(message: any): string {
    switch (message.type) {
      case 'text': return message.text?.body || '';
      case 'image': return message.image?.caption || '[Image]';
      case 'video': return message.video?.caption || '[Video]';
      case 'audio': return message.audio?.voice ? '[Voice Message]' : '[Audio]';
      case 'document': return message.document?.filename || '[Document]';
      case 'location': return message.location?.name || '[Location]';
      case 'sticker': return '[Sticker]';
      case 'contacts': return '[Contact]';
      case 'button': return message.button?.text || '[Button]';
      case 'interactive': 
        if (message.interactive?.type === 'list_reply') return message.interactive.list_reply.title;
        if (message.interactive?.type === 'button_reply') return message.interactive.button_reply.title;
        return '[Interactive]';
      default: return `[${message.type}]`;
    }
  }
}
