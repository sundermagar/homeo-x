import type { WhatsAppGateway } from '../../domains/whatsapp/ports/whatsapp-gateway.js';
import type { WhatsAppRepository } from '../../domains/whatsapp/ports/whatsapp.repository.js';
import { createLogger } from '../../shared/logger.js';

const logger = createLogger('whatsapp-gateway');

export class WhatsAppCloudGateway implements WhatsAppGateway {
  private apiVersion = process.env.WHATSAPP_API_VERSION || 'v24.0';
  private baseUrl = `https://graph.facebook.com/${this.apiVersion}`;

  constructor(private readonly waRepo: WhatsAppRepository) {}

  private async getHeaders(channelId?: number) {
    let accessToken = process.env.WHATSAPP_TOKEN;

    if (channelId) {
      const channel = await this.waRepo.findChannelById(channelId);
      if (channel?.accessToken) accessToken = channel.accessToken;
    }

    if (!accessToken) throw new Error(`WhatsApp token not found in DB or .env`);

    return {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async getPhoneNumberId(channelId?: number) {
    let phoneId = process.env.PHONE_NUMBER_ID;

    if (channelId) {
      const channel = await this.waRepo.findChannelById(channelId);
      if (channel?.phoneNumberId) phoneId = channel.phoneNumberId;
    }

    if (!phoneId) throw new Error(`WhatsApp Phone Number ID not found in DB or .env`);
    return phoneId;
  }

  async sendText(channelId: number | null, to: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const phoneNumberId = await this.getPhoneNumberId(channelId || undefined);

      const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace(/\D/g, ''),
        type: 'text',
        text: { body: text },
      };

      const response = await fetch(`${this.baseUrl}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: await this.getHeaders(channelId || undefined),
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

  private async getWabaId(channelId?: number) {
    let wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    if (channelId) {
      const channel = await this.waRepo.findChannelById(channelId);
      if (channel?.whatsappBusinessAccountId) wabaId = channel.whatsappBusinessAccountId;
    }
    if (!wabaId) throw new Error(`WhatsApp Business Account ID not found in DB or .env`);
    return wabaId;
  }

  async sendTemplate(channelId: number | null, to: string, templateName: string, language: string, components: any[]): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const phoneNumberId = await this.getPhoneNumberId(channelId || undefined);

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

      const response = await fetch(`${this.baseUrl}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: await this.getHeaders(channelId || undefined),
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

  async getTemplates(channelId: number | null): Promise<any[]> {
    try {
      const wabaId = await this.getWabaId(channelId || undefined);

      const response = await fetch(
        `${this.baseUrl}/${wabaId}/message_templates?limit=100`,
        { headers: await this.getHeaders(channelId || undefined) }
      );

      const data = await response.json() as any;
      if (!response.ok) throw new Error(data.error?.message || 'Failed to fetch templates');

      return data.data || [];
    } catch (err: any) {
      logger.error(`WhatsApp getTemplates error: ${err.message}`);
      throw err;
    }
  }

  async uploadMedia(channelId: number | null, file: Buffer, fileName: string, mimeType: string): Promise<string> {
    try {
      const phoneNumberId = await this.getPhoneNumberId(channelId || undefined);

      const formData = new FormData();
      formData.append('messaging_product', 'whatsapp');
      formData.append('file', new Blob([new Uint8Array(file)], { type: mimeType }), fileName);

      const headers = await this.getHeaders(channelId || undefined);
      // Remove Content-Type so fetch can auto-set the boundary for formData
      delete (headers as any)['Content-Type'];

      const response = await fetch(`${this.baseUrl}/${phoneNumberId}/media`, {
        method: 'POST',
        headers,
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

  async registerWebhook(channelId: number | null, callbackUrl: string, verifyToken: string): Promise<boolean> {
    // This typically involves manual setup in Meta dashboard, 
    // but some subscriptions can be automated via API for Embedded Signup
    return true;
  }
}
