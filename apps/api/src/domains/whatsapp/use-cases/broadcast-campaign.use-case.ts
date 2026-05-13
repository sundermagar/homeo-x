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

      const recipients = await this.waRepo.listRecipients(campaignId);
      let sentCount = 0;
      let failedCount = 0;

      for (const recipient of recipients) {
        // Skip already processed
        if (recipient.status === 'sent' || recipient.status === 'delivered' || recipient.status === 'read') {
          continue;
        }

        const result = await this.waGateway.sendTemplate(
          campaign.channelId,
          recipient.phone,
          campaign.templateName,
          campaign.templateLanguage,
          recipient.templateParams || []
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
