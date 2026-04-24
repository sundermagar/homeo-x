import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';
import type { WhatsAppGateway, WhatsAppPayload, WhatsAppGatewayResult } from '../../domains/communication/ports/whatsapp-gateway';
import { createLogger } from '../../shared/logger';

const logger = createLogger('bulkshooters-whatsapp-gateway');

/**
 * BulkShooters WhatsApp Gateway Adapter
 * Connects to https://bulkshooters.in/api/send/whatsapp
 */
export class BulkShootersWhatsAppGateway implements WhatsAppGateway {
  readonly name = 'BulkShooters';

  private readonly url: string;
  private readonly secret: string;
  private readonly defaultInstance: string;

  constructor() {
    this.url             = (process.env.WHATSAPP_API_URL || 'https://bulkshooters.in/api/send/whatsapp').trim();
    this.secret          = process.env.WHATSAPP_SECRET || '';
    this.defaultInstance = process.env.WHATSAPP_ACCOUNT_DEFAULT || '';
  }

  private get isConfigured(): boolean {
    return Boolean(this.secret && this.defaultInstance);
  }

  async send(payload: WhatsAppPayload): Promise<WhatsAppGatewayResult> {
    if (!this.isConfigured) {
      logger.warn('[BulkShooters] Not configured — check WHATSAPP_SECRET/WHATSAPP_ACCOUNT_DEFAULT');
      return { success: false, error: 'Not configured' };
    }

    // Normalise phone: remove all non-digits, ensure 91 prefix for India
    let phone = payload.phone.replace(/\D/g, '');
    if (phone.length === 10) phone = `91${phone}`;

    const params = new URLSearchParams({
      instance_id:  payload.instanceId || this.defaultInstance,
      access_token: this.secret,
      number:       phone,
      message:      payload.message,
      type:         'text'
    });

    return new Promise((resolve) => {
      try {
        const fullUrlString = `${this.url}?${params.toString()}`;
        const parsedUrl = new URL(fullUrlString);
        
        const options: any = {
          method: 'GET',
          timeout: 15000,
          family: 4, // 🔌 Force IPv4 for robust connection
          headers: {
            'User-Agent': 'HomeoX-API/1.0',
          }
        };

        const protocol = parsedUrl.protocol === 'https:' ? https : http;
        
        logger.info('[BulkShooters] Sending WhatsApp to %s via %s', phone, parsedUrl.hostname);

        const req = protocol.get(fullUrlString, options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300 && json.status === 'success') {
                logger.info('[BulkShooters] Sent successfully — messageId=%s', json.message_id || 'ok');
                resolve({ success: true, messageId: String(json.message_id || 'ok') });
              } else {
                logger.error('[BulkShooters] API Error: %s', data);
                resolve({ success: false, error: json.message || data });
              }
            } catch {
              // Fallback for non-JSON responses
              if (res.statusCode === 200) {
                resolve({ success: true });
              } else {
                resolve({ success: false, error: `HTTP ${res.statusCode}: ${data}` });
              }
            }
          });
        });

        req.on('error', (err: any) => {
          logger.error('[BulkShooters] Connection failed: %s', err.message);
          resolve({ success: false, error: err.message });
        });

        req.on('timeout', () => {
          req.destroy();
          logger.error('[BulkShooters] Request timed out');
          resolve({ success: false, error: 'Request timed out' });
        });

      } catch (err: any) {
        logger.error('[BulkShooters] Unexpected error: %s', err.message);
        resolve({ success: false, error: err.message });
      }
    });
  }

  async sendBatch(payloads: WhatsAppPayload[]): Promise<WhatsAppGatewayResult[]> {
    return Promise.all(payloads.map(p => this.send(p)));
  }
}

/** Null gateway used when no provider is configured — logs only */
export class MockWhatsAppGateway implements WhatsAppGateway {
  readonly name = 'Mock';

  async send(payload: WhatsAppPayload): Promise<WhatsAppGatewayResult> {
    logger.info('[MockWhatsApp] To: %s | Message: %s', payload.phone, payload.message);
    return { success: true, messageId: `mock-${Date.now()}` };
  }

  async sendBatch(payloads: WhatsAppPayload[]): Promise<WhatsAppGatewayResult[]> {
    return Promise.all(payloads.map(p => this.send(p)));
  }
}

/** Factory — picks the right gateway based on env */
export function createWhatsAppGateway(): WhatsAppGateway {
  if (process.env.WHATSAPP_SECRET && process.env.WHATSAPP_ACCOUNT_DEFAULT) {
    logger.info('WhatsApp gateway initialized with BulkShooters');
    return new BulkShootersWhatsAppGateway();
  }
  logger.warn('WhatsApp gateway running in MOCK mode. Set WHATSAPP_SECRET to send real messages.');
  return new MockWhatsAppGateway();
}
