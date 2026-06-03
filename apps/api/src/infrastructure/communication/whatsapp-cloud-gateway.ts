import type { WhatsAppGateway } from '../../domains/whatsapp/ports/whatsapp-gateway.js';
import type { WhatsAppRepository } from '../../domains/whatsapp/ports/whatsapp.repository.js';
import { createLogger } from '../../shared/logger.js';

const logger = createLogger('whatsapp-gateway');

export class WhatsAppCloudGateway implements WhatsAppGateway {
  private apiVersion = process.env.META_API_VERSION || process.env.WHATSAPP_API_VERSION || 'v22.0';
  private baseUrl = `https://graph.facebook.com/${this.apiVersion}`;

  constructor(private readonly waRepo: WhatsAppRepository) {}

  private isAuthError(data: any, errorMessage: string): boolean {
    const isTokenExpired = data?.error?.code === 190 || data?.error?.error_subcode === 463 || data?.error?.error_subcode === 467;
    const isAuthMessage = errorMessage.includes('Authentication Error') || errorMessage.includes('access token') || errorMessage.toLowerCase().includes('auth');
    return isTokenExpired || isAuthMessage;
  }

  private async getHeaders(channelId?: number) {
    let accessToken = process.env.WHATSAPP_TOKEN;

    if (!accessToken && channelId) {
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

    if (!phoneId && channelId) {
      const channel = await this.waRepo.findChannelById(channelId);
      if (channel?.phoneNumberId) phoneId = channel.phoneNumberId;
    }

    if (!phoneId) throw new Error(`WhatsApp Phone Number ID not found in DB or .env`);
    return phoneId;
  }

  async sendText(channelId: number | null, to: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const phoneNumberId = await this.getPhoneNumberId(channelId || undefined);
      const cleanTo = to.replace(/\D/g, '');

      logger.info(`[SendText] Sending to: ${cleanTo}, channelId: ${channelId}, phoneNumberId: ${phoneNumberId}`);

      const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanTo,
        type: 'text',
        text: { body: text },
      };

      const url = `${this.baseUrl}/${phoneNumberId}/messages`;
      logger.info(`[SendText] POST ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: await this.getHeaders(channelId || undefined),
        body: JSON.stringify(body),
      });

      const data = await response.json() as any;

      if (!response.ok) {
        logger.error(`[SendText] ❌ Meta API Error (HTTP ${response.status}): ${JSON.stringify(data)}`);
        let errorMessage = data.error?.message || 'Unknown error';
        if (this.isAuthError(data, errorMessage)) {
          errorMessage = 'WhatsApp API Authentication Failed: Your access token is invalid or has expired. Please update WHATSAPP_TOKEN in your .env file or database configuration.';
        }
        return { success: false, error: errorMessage };
      }

      const messageId = data.messages?.[0]?.id;
      logger.info(`[SendText] ✅ Message accepted by Meta! wamid: ${messageId}, to: ${cleanTo}`);
      return { success: true, messageId };
    } catch (err: any) {
      logger.error(`[SendText] ❌ Exception: ${err.message}`);
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
      const cleanTo = to.replace(/\D/g, '');

      // NOTE: Template media headers (video/image/document) are now injected
      // automatically by the route handler's pre-fetch logic from the database.
      // Do NOT hardcode template-specific media here.
      let finalComponents = components;

      const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanTo,
        type: 'template',
        template: {
          name: templateName,
          language: { code: language },
          components: finalComponents.length > 0 ? finalComponents : undefined,
        },
      };

      const url = `${this.baseUrl}/${phoneNumberId}/messages`;
      logger.info(`[SendTemplate] Sending template "${templateName}" to: ${cleanTo}, channelId: ${channelId}, phoneNumberId: ${phoneNumberId}`);
      logger.info(`[SendTemplate] POST ${url}`);
      logger.info(`[SendTemplate] Request body: ${JSON.stringify(body)}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: await this.getHeaders(channelId || undefined),
        body: JSON.stringify(body),
      });

      const data = await response.json() as any;
      if (!response.ok) {
        logger.error(`[SendTemplate] ❌ Meta API Error (HTTP ${response.status}): ${JSON.stringify(data)}`);
        let errorMessage = data.error?.message || 'Unknown error';
        if (this.isAuthError(data, errorMessage)) {
          errorMessage = 'WhatsApp API Authentication Failed: Your access token is invalid or has expired. Please update WHATSAPP_TOKEN in your .env file or database configuration.';
        }
        return { success: false, error: errorMessage };
      }

      const messageId = data.messages?.[0]?.id;
      logger.info(`[SendTemplate] ✅ Template accepted by Meta! wamid: ${messageId}, to: ${cleanTo}, template: ${templateName}`);
      return { success: true, messageId };
    } catch (err: any) {
      logger.error(`[SendTemplate] ❌ Exception: ${err.message}`);
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
      if (!response.ok) {
        logger.error(`[GetTemplates] ❌ Meta API Error (HTTP ${response.status}): ${JSON.stringify(data)}`);
        let errorMessage = data.error?.message || 'Failed to fetch templates';
        if (this.isAuthError(data, errorMessage)) {
          errorMessage = 'WhatsApp API Authentication Failed: Your access token is invalid or has expired. Please update WHATSAPP_TOKEN in your configuration.';
        }
        throw new Error(errorMessage);
      }

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
        logger.error(`[UploadMedia] ❌ Meta API Error (HTTP ${response.status}): ${JSON.stringify(data)}`);
        let errorMessage = data.error?.message || 'Failed to upload media';
        if (this.isAuthError(data, errorMessage)) {
          errorMessage = 'WhatsApp API Authentication Failed: Your access token is invalid or has expired. Please update WHATSAPP_TOKEN in your configuration.';
        }
        throw new Error(errorMessage);
      }

      return data.id;
    } catch (err: any) {
      logger.error(`WhatsApp uploadMedia exception: ${err.message}`);
      throw err;
    }
  }

  async downloadMedia(channelId: number | null, mediaId: string): Promise<{ buffer: Buffer; mimeType: string; originalFilename?: string } | null> {
    try {
      logger.info(`[DownloadMedia] Fetching media metadata for mediaId: ${mediaId}`);
      const headers = await this.getHeaders(channelId || undefined);
      
      // Step 1: Get media URL
      const metaResponse = await fetch(`${this.baseUrl}/${mediaId}`, { headers });
      const metaData = await metaResponse.json() as any;
      
      if (!metaResponse.ok || !metaData.url) {
        logger.error(`[DownloadMedia] ❌ Failed to get media URL (HTTP ${metaResponse.status}): ${JSON.stringify(metaData)}`);
        return null;
      }
      
      const mediaUrl = metaData.url;
      const mimeType = metaData.mime_type || 'application/octet-stream';
      // Some file types have filename (like documents)
      const originalFilename = metaData.filename; 

      logger.info(`[DownloadMedia] Downloading actual binary from: ${mediaUrl}`);
      // Step 2: Download binary data
      const binaryResponse = await fetch(mediaUrl, { headers });
      
      if (!binaryResponse.ok) {
        logger.error(`[DownloadMedia] ❌ Failed to download binary (HTTP ${binaryResponse.status})`);
        return null;
      }

      const arrayBuffer = await binaryResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      logger.info(`[DownloadMedia] ✅ Downloaded ${buffer.byteLength} bytes successfully`);
      return { buffer, mimeType, originalFilename };
    } catch (err: any) {
      logger.error(`WhatsApp downloadMedia exception: ${err.message}`);
      return null;
    }
  }

  async sendMedia(channelId: number | null, to: string, mediaId: string, mediaType: 'image' | 'video' | 'audio' | 'document', fileName?: string, caption?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const phoneNumberId = await this.getPhoneNumberId(channelId || undefined);
      const cleanTo = to.replace(/\D/g, '');

      logger.info(`[SendMedia] Sending media to: ${cleanTo}, channelId: ${channelId}, mediaId: ${mediaId}, type: ${mediaType}, caption: ${caption}`);

      const mediaPayload: any = { id: mediaId };
      if (mediaType === 'document' && fileName) {
        mediaPayload.filename = fileName;
      }
      if (caption && mediaType !== 'audio') {
        mediaPayload.caption = caption;
      }

      const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanTo,
        type: mediaType,
        [mediaType]: mediaPayload
      };

      const url = `${this.baseUrl}/${phoneNumberId}/messages`;
      logger.info(`[SendMedia] POST ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: await this.getHeaders(channelId || undefined),
        body: JSON.stringify(body),
      });

      const data = await response.json() as any;

      if (!response.ok) {
        logger.error(`[SendMedia] ❌ Meta API Error (HTTP ${response.status}): ${JSON.stringify(data)}`);
        let errorMessage = data.error?.message || 'Unknown error';
        if (this.isAuthError(data, errorMessage)) {
          errorMessage = 'WhatsApp API Authentication Failed: Your access token is invalid or has expired. Please update WHATSAPP_TOKEN in your configuration.';
        }
        return { success: false, error: errorMessage };
      }

      const messageId = data.messages?.[0]?.id;
      logger.info(`[SendMedia] ✅ Media accepted by Meta! wamid: ${messageId}, to: ${cleanTo}`);
      return { success: true, messageId };
    } catch (err: any) {
      logger.error(`[SendMedia] ❌ Exception: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async registerWebhook(channelId: number | null, callbackUrl: string, verifyToken: string): Promise<boolean> {
    // This typically involves manual setup in Meta dashboard, 
    // but some subscriptions can be automated via API for Embedded Signup
    return true;
  }

  async sendReaction(channelId: number | null, to: string, messageId: string, emoji: string): Promise<{ success: boolean; error?: string }> {
    try {
      const phoneNumberId = await this.getPhoneNumberId(channelId || undefined);
      const cleanTo = to.replace(/\D/g, '');

      logger.info(`[SendReaction] Sending reaction to: ${cleanTo}, messageId: ${messageId}`);

      const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanTo,
        type: 'reaction',
        reaction: {
          message_id: messageId,
          emoji: emoji
        }
      };

      const url = `${this.baseUrl}/${phoneNumberId}/messages`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: await this.getHeaders(channelId || undefined),
        body: JSON.stringify(body),
      });

      const data = await response.json() as any;

      if (!response.ok) {
        logger.error(`[SendReaction] ❌ Meta API Error (HTTP ${response.status}): ${JSON.stringify(data)}`);
        return { success: false, error: data.error?.message || 'Unknown error' };
      }

      logger.info(`[SendReaction] ✅ Reaction accepted by Meta!`);
      return { success: true };
    } catch (err: any) {
      logger.error(`[SendReaction] ❌ Exception: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
}
