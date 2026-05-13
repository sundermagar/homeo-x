import { createLogger } from '../../../shared/logger.js';
import type { WhatsAppGateway } from '../ports/whatsapp-gateway.js';
import type { WhatsAppRepository } from '../ports/whatsapp.repository.js';

const logger = createLogger('sync-templates-use-case');

export interface SyncResult {
  channelId: number;
  total: number;
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
  errors: string[];
  syncedAt: string;
}

/**
 * SyncTemplatesUseCase
 * 
 * Fetches all message templates from the Meta Graph API for a given channel,
 * then upserts them into the local database. Handles:
 * - Intelligent diff-based upsert (skip unchanged templates)
 * - Variable extraction from {{n}} placeholders
 * - Media type detection from HEADER components
 * - Button parsing (URL, QUICK_REPLY, PHONE_NUMBER)
 * - Carousel card extraction for multi-card templates
 */
export class SyncTemplatesUseCase {
  constructor(
    private readonly gateway: WhatsAppGateway,
    private readonly waRepo: WhatsAppRepository
  ) {}

  async execute(channelId: number): Promise<SyncResult> {
    const result: SyncResult = {
      channelId,
      total: 0,
      created: 0,
      updated: 0,
      unchanged: 0,
      failed: 0,
      errors: [],
      syncedAt: new Date().toISOString(),
    };

    try {
      // 1. Fetch all templates from Meta Graph API
      const remoteTemplates = await this.gateway.getTemplates(channelId);
      result.total = remoteTemplates.length;
      logger.info(`Fetched ${remoteTemplates.length} templates from Meta for channel ${channelId}`);

      // 2. Process each template
      for (const remote of remoteTemplates) {
        try {
          const parsed = this.parseMetaTemplate(remote, channelId);
          const { action } = await (this.waRepo as any).upsertTemplate(parsed);

          if (action === 'created') result.created++;
          else if (action === 'updated') result.updated++;
          else result.unchanged++;
        } catch (err: any) {
          result.failed++;
          result.errors.push(`${remote.name}: ${err.message}`);
          logger.warn(`Failed to sync template ${remote.name}: ${err.message}`);
        }
      }

      logger.info(
        `Sync complete for channel ${channelId}: ` +
        `${result.created} created, ${result.updated} updated, ` +
        `${result.unchanged} unchanged, ${result.failed} failed`
      );
    } catch (err: any) {
      logger.error(`Template sync failed for channel ${channelId}: ${err.message}`);
      throw err;
    }

    return result;
  }

  /**
   * Transforms a raw Meta Graph API template object into our local schema format.
   */
  private parseMetaTemplate(remote: any, channelId: number) {
    const components = remote.components || [];

    // Extract component parts
    const headerComp = components.find((c: any) => c.type === 'HEADER');
    const bodyComp = components.find((c: any) => c.type === 'BODY');
    const footerComp = components.find((c: any) => c.type === 'FOOTER');
    const buttonsComp = components.find((c: any) => c.type === 'BUTTONS');
    const carouselComp = components.find((c: any) => c.type === 'CAROUSEL');

    // Extract body text and detect variables
    const bodyText = bodyComp?.text || '';
    const variableMatches = bodyText.match(/\{\{\d+\}\}/g) || [];
    const variableExamples = bodyComp?.example?.body_text?.[0] || [];

    // Detect media type from header
    let mediaType: string = 'text';
    let mediaUrl: string | null = null;
    let mediaHandle: string | null = null;

    if (headerComp) {
      if (headerComp.format === 'IMAGE') mediaType = 'image';
      else if (headerComp.format === 'VIDEO') mediaType = 'video';
      else if (headerComp.format === 'DOCUMENT') mediaType = 'document';
      else if (headerComp.format === 'LOCATION') mediaType = 'location';

      // Extract example media handle if provided
      if (headerComp.example?.header_handle?.[0]) {
        mediaHandle = headerComp.example.header_handle[0];
      }
    }

    // Parse buttons
    const buttons = buttonsComp?.buttons?.map((btn: any) => ({
      type: btn.type,          // URL, QUICK_REPLY, PHONE_NUMBER, COPY_CODE
      text: btn.text,
      url: btn.url,
      phoneNumber: btn.phone_number,
      example: btn.example,
    })) || [];

    // Parse carousel cards
    const carouselCards = carouselComp?.cards?.map((card: any) => ({
      header: card.components?.find((c: any) => c.type === 'HEADER'),
      body: card.components?.find((c: any) => c.type === 'BODY')?.text,
      buttons: card.components?.find((c: any) => c.type === 'BUTTONS')?.buttons || [],
    })) || [];

    return {
      channelId,
      whatsappTemplateId: remote.id,
      name: remote.name,
      status: remote.status?.toLowerCase() || 'draft',     // APPROVED -> approved
      category: remote.category?.toLowerCase() || 'utility', // MARKETING -> marketing
      language: remote.language || 'en_US',
      header: headerComp?.text || null,
      body: bodyText,
      footer: footerComp?.text || null,
      buttons,
      variables: variableExamples.length > 0
        ? variableExamples
        : variableMatches.map((_: any, i: number) => `Variable ${i + 1}`),
      mediaType,
      mediaUrl,
      mediaHandle,
      carouselCards: carouselCards.length > 0 ? carouselCards : [],
    };
  }
}
