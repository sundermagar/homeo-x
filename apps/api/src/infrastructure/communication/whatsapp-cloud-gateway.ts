import type { WhatsAppGateway } from '../../domains/whatsapp/ports/whatsapp-gateway.js';
import type { WhatsAppRepository } from '../../domains/whatsapp/ports/whatsapp.repository.js';
import { createLogger } from '../../shared/logger.js';

const logger = createLogger('whatsapp-gateway');

export class WhatsAppCloudGateway implements WhatsAppGateway {
  private apiVersion = process.env.WHATSAPP_API_VERSION || 'v24.0';
  private baseUrl = `https://graph.facebook.com/${this.apiVersion}`;

  constructor(private readonly waRepo: WhatsAppRepository) {}

  private async getHeaders(channelId: number) {
    const channel = await this.waRepo.findChannelById(channelId);
    if (!channel) throw new Error(`Channel ${channelId} not found`);
    return {
      'Authorization': `Bearer ${channel.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  async sendText(channelId: number, to: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const channel = await this.waRepo.findChannelById(channelId);
      if (!channel) return { success: false, error: 'Channel not found' };

      const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace(/\D/g, ''),
        type: 'text',
        text: { body: text },
      };

      const response = await fetch(`${this.baseUrl}/${channel.phoneNumberId}/messages`, {
        method: 'POST',
        headers: await this.getHeaders(channelId),
        body: JSON.stringify(body),
      });

      const data = await response.json() as any;
      if (!response.ok) {
        logger.error(`WhatsApp sendText error: ${JSON.stringify(data)}`);
        return { success: false, error: data.error?.message || 'Unknown error' };
      }

      return { success: true, messageId: data.messages?.[0]?.id };
    } catch (err: any) {
      logger.error(`WhatsApp sendText exception: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async sendTemplate(channelId: number, to: string, templateName: string, language: string, components: any[]): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const channel = await this.waRepo.findChannelById(channelId);
      if (!channel) return { success: false, error: 'Channel not found' };

      const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace(/\D/g, ''),
        type: 'template',
        template: {
          name: templateName,
          language: { code: language },
          components: components.length > 0 ? components : undefined,
        },
      };

      const response = await fetch(`${this.baseUrl}/${channel.phoneNumberId}/messages`, {
        method: 'POST',
        headers: await this.getHeaders(channelId),
        body: JSON.stringify(body),
      });

      const data = await response.json() as any;
      if (!response.ok) {
        logger.error(`WhatsApp sendTemplate error: ${JSON.stringify(data)}`);
        return { success: false, error: data.error?.message || 'Unknown error' };
      }

      return { success: true, messageId: data.messages?.[0]?.id };
    } catch (err: any) {
      logger.error(`WhatsApp sendTemplate exception: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async getTemplates(channelId: number): Promise<any[]> {
    try {
      const channel = await this.waRepo.findChannelById(channelId);
      if (!channel) throw new Error('Channel not found');

      const response = await fetch(
        `${this.baseUrl}/${channel.whatsappBusinessAccountId}/message_templates?limit=100`,
        { headers: await this.getHeaders(channelId) }
      );

      const data = await response.json() as any;
      if (!response.ok) throw new Error(data.error?.message || 'Failed to fetch templates');

      return data.data || [];
    } catch (err: any) {
      logger.error(`WhatsApp getTemplates error: ${err.message}`);
      throw err;
    }
  }

  async uploadMedia(channelId: number, file: Buffer, fileName: string, mimeType: string): Promise<string> {
    try {
      const channel = await this.waRepo.findChannelById(channelId);
      if (!channel) throw new Error('Channel not found');

      const formData = new FormData();
      formData.append('messaging_product', 'whatsapp');
      formData.append('file', new Blob([new Uint8Array(file)], { type: mimeType }), fileName);

      const response = await fetch(`${this.baseUrl}/${channel.phoneNumberId}/media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${channel.accessToken}`,
        },
        body: formData,
      });

      const data = await response.json() as any;
      if (!response.ok) {
        logger.error(`WhatsApp uploadMedia error: ${JSON.stringify(data)}`);
        throw new Error(data.error?.message || 'Failed to upload media');
      }

      return data.id;
    } catch (err: any) {
      logger.error(`WhatsApp uploadMedia exception: ${err.message}`);
      throw err;
    }
  }

  async registerWebhook(channelId: number, callbackUrl: string, verifyToken: string): Promise<boolean> {
    // This typically involves manual setup in Meta dashboard, 
    // but some subscriptions can be automated via API for Embedded Signup
    return true;
  }
}
