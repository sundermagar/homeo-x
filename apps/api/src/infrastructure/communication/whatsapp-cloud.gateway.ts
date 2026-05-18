import https from 'node:https';
import { URL } from 'node:url';
import type { WhatsAppGateway, WhatsAppPayload, WhatsAppGatewayResult, WhatsAppQRResult, WhatsAppStatusResult } from '../../domains/communication/ports/whatsapp-gateway.js';
import { createLogger } from '../../shared/logger.js';

const logger = createLogger('whatsapp-cloud-gateway');

export class WhatsAppCloudGateway implements WhatsAppGateway {
  readonly name = 'MetaCloudAPI';

  private readonly token: string;
  private readonly phoneNumberId: string;
  private readonly apiVersion: string;

  constructor() {
    this.token = process.env.WHATSAPP_TOKEN || '';
    this.phoneNumberId = process.env.PHONE_NUMBER_ID || '';
    this.apiVersion = process.env.META_API_VERSION || 'v22.0';
  }

  async send(payload: WhatsAppPayload): Promise<WhatsAppGatewayResult> {
    if (!this.token || !this.phoneNumberId) {
      logger.warn('[WhatsAppCloud] Missing WHATSAPP_TOKEN or PHONE_NUMBER_ID in environment variables.');
      return { success: false, error: 'Not configured' };
    }

    // Normalise phone number to WhatsApp Cloud API format (requires country code but no '+' usually)
    let phone = payload.phone.replace(/\D/g, '');
    if (phone.length === 10) phone = `91${phone}`;

    logger.info('[WhatsAppCloud] Sending message to %s', phone);

    const data = JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'text',
      text: {
        preview_url: false,
        body: payload.message,
      },
    });

    const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
    const parsedUrl = new URL(url);

    const options: https.RequestOptions = {
      method: 'POST',
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => { responseData += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(responseData);
            if (res.statusCode === 200 || res.statusCode === 201) {
              logger.info('[WhatsAppCloud] Successfully sent message to %s', phone);
              resolve({ success: true, messageId: json.messages?.[0]?.id || 'unknown' });
            } else {
              logger.error('[WhatsAppCloud] Error sending message: %j', json.error);
              resolve({ success: false, error: json.error?.message || 'Unknown Meta API error' });
            }
          } catch (err) {
            resolve({ success: false, error: 'Failed to parse Meta API response' });
          }
        });
      });

      req.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      req.write(data);
      req.end();
    });
  }

  async sendBatch(payloads: WhatsAppPayload[]): Promise<WhatsAppGatewayResult[]> {
    return Promise.all(payloads.map(p => this.send(p)));
  }

  async getQrCode(): Promise<WhatsAppQRResult> {
    // Cloud API doesn't use QR codes for authentication.
    return { success: false, error: 'QR Code not applicable for Meta Cloud API' };
  }

  async checkStatus(): Promise<WhatsAppStatusResult> {
    return { success: true, connected: true };
  }
}
