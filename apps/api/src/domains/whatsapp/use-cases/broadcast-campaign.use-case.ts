import { Result, ok, fail } from '../../../shared/result.js';
import { createLogger } from '../../../shared/logger.js';
import type { WhatsAppRepository } from '../ports/whatsapp.repository.js';
import type { WhatsAppGateway } from '../ports/whatsapp-gateway.js';

const logger = createLogger('broadcast-campaign-use-case');

export class BroadcastCampaignUseCase {
  constructor(
    private readonly waRepo: WhatsAppRepository,
    private readonly waGateway: WhatsAppGateway
  ) {}

  async execute(campaignId: number): Promise<Result<{ sent: number; failed: number }>> {
    try {
      const campaign = await this.waRepo.findCampaignById(campaignId);
      if (!campaign) return fail('Campaign not found');

      if (campaign.status === 'completed') {
        return ok({ sent: campaign.sentCount, failed: campaign.failedCount });
      }

      // Mark as active
      await this.waRepo.saveCampaign({ id: campaignId, status: 'active' });

      const templates = await this.waRepo.listTemplates(campaign.channelId);
      const template = templates.find(t => t.name === campaign.templateName);

      const recipients = await this.waRepo.listRecipients(campaignId);
      let sentCount = 0;
      let failedCount = 0;

      for (const recipient of recipients) {
        // Skip already processed
        if (recipient.status === 'sent' || recipient.status === 'delivered' || recipient.status === 'read') {
          continue;
        }

        // Construct standard text from template body
        let textToSend = 'Hello from MMC HomeoTech!'; // Fallback
        
        if (template && template.body) {
          textToSend = template.body;
          if (recipient.templateParams && Array.isArray(recipient.templateParams)) {
            recipient.templateParams.forEach((param: string, idx: number) => {
              textToSend = textToSend.replace(new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g'), param || '');
            });
          }
          if (template.header) textToSend = `*${template.header}*\n\n${textToSend}`;
          if (template.footer) textToSend = `${textToSend}\n\n_${template.footer}_`;
        } else if (campaign.name) {
          textToSend = `Automated Broadcast: ${campaign.name}`;
        }

        const result = await this.waGateway.sendText(
          campaign.channelId,
          recipient.phone,
          textToSend
        );

        if (result.success) {
          await this.waRepo.saveRecipient({
            id: recipient.id,
            status: 'sent',
            whatsappMessageId: result.messageId,
            sentAt: new Date(),
          });
          sentCount++;
        } else {
          await this.waRepo.saveRecipient({
            id: recipient.id,
            status: 'failed',
            errorMessage: result.error,
          });
          failedCount++;
        }

        // Update campaign stats periodically or after each message
        await this.waRepo.updateCampaignStats(campaignId, {
          sentCount: (campaign.sentCount || 0) + sentCount,
          failedCount: (campaign.failedCount || 0) + failedCount,
        });
      }

      await this.waRepo.saveCampaign({
        id: campaignId,
        status: 'completed',
        completedAt: new Date(),
      });

      logger.info(`Campaign ${campaignId} broadcast finished. Sent: ${sentCount}, Failed: ${failedCount}`);
      return ok({ sent: sentCount, failed: failedCount });

    } catch (err: any) {
      logger.error(`Campaign broadcast error: ${err.message}`);
      return fail(err.message);
    }
  }
}
