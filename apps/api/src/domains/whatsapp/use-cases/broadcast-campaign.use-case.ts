import { Result, ok, fail } from '../../../shared/result.js';
import { createLogger } from '../../../shared/logger.js';
import type { WhatsAppRepository } from '../ports/whatsapp.repository.js';
import type { WhatsAppGateway } from '../ports/whatsapp-gateway.js';

const logger = createLogger('broadcast-campaign-use-case');

export class BroadcastCampaignUseCase {
  constructor(
    private readonly waRepo: WhatsAppRepository,
    private readonly waGateway: WhatsAppGateway,
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

      const templateName = campaign.templateName;
      const templateLanguage = campaign.templateLanguage || 'en_US';

      // Fetch the template from DB for body interpolation (for conversation logging)
      const templates = await this.waRepo.listTemplates(campaign.channelId);
      const template = templates.find((t: any) => t.name === templateName);

      // Validate: template must exist on Meta (not local-only)
      if (
        template &&
        template.whatsappTemplateId &&
        String(template.whatsappTemplateId).startsWith('local_')
      ) {
        return fail(
          `Template '${templateName}' is only saved locally. It must be registered and approved in your Meta WhatsApp Business Account before broadcasting. Please create it on Meta and click 'Sync Templates'.`,
        );
      }

      const recipients = await this.waRepo.listRecipients(campaignId);
      let sentCount = 0;
      let failedCount = 0;

      for (const recipient of recipients) {
        // Skip already processed
        if (
          recipient.status === 'sent' ||
          recipient.status === 'delivered' ||
          recipient.status === 'read'
        ) {
          continue;
        }

        // Build template components with recipient-specific parameters
        const components: any[] = [];
        if (
          recipient.templateParams &&
          Array.isArray(recipient.templateParams) &&
          recipient.templateParams.length > 0
        ) {
          components.push({
            type: 'body',
            parameters: recipient.templateParams.map((param: string) => ({
              type: 'text',
              text: param || '',
            })),
          });
        }

        // Send via Meta Template API (compliant with WhatsApp Business Policy)
        const result = await this.waGateway.sendTemplate(
          campaign.channelId,
          recipient.phone,
          templateName,
          templateLanguage,
          components,
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

        // Update campaign stats with absolute counts (not stale-additive)
        await this.waRepo.updateCampaignStats(campaignId, {
          sentCount,
          failedCount,
        });
      }

      await this.waRepo.saveCampaign({
        id: campaignId,
        status: 'completed',
        completedAt: new Date(),
        sentCount,
        failedCount,
      });

      logger.info(
        `Campaign ${campaignId} broadcast finished. Sent: ${sentCount}, Failed: ${failedCount}`,
      );
      return ok({ sent: sentCount, failed: failedCount });
    } catch (err: any) {
      logger.error(`Campaign broadcast error: ${err.message}`);
      return fail(err.message);
    }
  }
}
