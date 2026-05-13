import { createLogger } from '../../../shared/logger.js';
import type { WhatsAppRepository } from '../ports/whatsapp.repository.js';
import type { WhatsAppCloudGateway } from '../../../infrastructure/communication/whatsapp-cloud-gateway.js';

const logger = createLogger('execute-automation-use-case');

export class ExecuteAutomationUseCase {
  constructor(
    private readonly waRepo: WhatsAppRepository,
    private readonly gateway: any // Should be WhatsAppCloudGateway
  ) {}

  async execute(automationId: number, conversationId: number, triggerData: any): Promise<void> {
    logger.info(`Starting execution for automation ${automationId} in conversation ${conversationId}`);

    try {
      const automation = await (this.waRepo as any).findAutomationById(automationId);
      if (!automation || automation.status !== 'active') {
        logger.warn(`Automation ${automationId} not found or inactive`);
        return;
      }

      // In a real implementation, we would parse nodes and edges.
      // For this "Keyword-based Auto Reply" flow, we'll start with a simple implementation
      // that sends a predefined response if the automation type is 'keyword_reply'.
      
      const conversation = await (this.waRepo as any).findConversationById(conversationId);
      if (!conversation) {
        logger.error(`Conversation ${conversationId} not found`);
        return;
      }

      // Logic to handle different node types would go here.
      // For now, let's implement the core logic for the "Keyword" trigger.
      
      if (automation.trigger === 'keyword') {
        const flowData = automation.flowData as any;
        const responseMessage = flowData.response || "Thank you for contacting us. How can we help you today?";
        
        const result = await this.gateway.sendText(conversation.channelId, conversation.contactPhone, responseMessage);
        
        if (result.success) {
          await this.waRepo.saveMessage({
            conversationId: conversation.id,
            whatsappMessageId: result.messageId,
            direction: 'outbound',
            content: responseMessage,
            type: 'text',
            status: 'sent',
            timestamp: new Date()
          });

          await this.waRepo.saveConversation({
            id: conversation.id,
            lastMessageAt: new Date(),
            lastMessageText: responseMessage.substring(0, 200)
          });
          
          logger.info(`Auto-reply sent for automation ${automationId}`);
        }
      }

      // Increment execution count
      await (this.waRepo as any).saveAutomation({
        id: automation.id,
        executionCount: (automation.executionCount || 0) + 1,
        lastExecutedAt: new Date()
      });

    } catch (err: any) {
      logger.error(`Automation execution failed: ${err.message}`);
    }
  }
}
