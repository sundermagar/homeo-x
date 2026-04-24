import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';
import type { SmsGateway, SmsPayload, SmsGatewayResult } from '../../domains/communication/ports/sms-gateway';
import { createLogger } from '../../shared/logger';

const logger = createLogger('bulksmsprime-gateway');

/**
 * Bulk SMS Prime Gateway Adapter
 * Uses native Node.js http/https modules for maximum compatibility with legacy servers.
 * Forcing IPv4 (family: 4) to bypass potential DNS resolution issues.
 */
export class BulkSmsPrimeGateway implements SmsGateway {
  readonly name = 'BulkSmsPrime';

  private readonly url: string;
  private readonly user: string;
  private readonly pass: string;
  private readonly sid: string;

  constructor() {
    this.url  = (process.env.SMS_API_URL || 'http://websms.bulksmsprime.com/vendorsms/pushsms.aspx').trim();
    this.user = process.env.SMS_API_USER || '';
    this.pass = process.env.SMS_API_PASSWORD || '';
    this.sid  = process.env.SMS_SENDER_ID || '';
  }

  private get isConfigured(): boolean {
    return Boolean(this.user && this.pass);
  }

  async send(payload: SmsPayload): Promise<SmsGatewayResult> {
    if (!this.isConfigured) {
      logger.warn('[BulkSmsPrime] Not configured — check SMS_API_USER/PASSWORD');
      return { messageId: `mock-${Date.now()}`, status: 'failed', error: 'Not configured' };
    }

    const phone = payload.phone.replace(/\D/g, '').slice(-10);
    const params = new URLSearchParams({
      user:     this.user,
      password: this.pass,
      msisdn:   phone,
      sid:      this.sid,
      msg:      payload.message,
      fl:       '0',
      dc:       '0'
    });

    return new Promise((resolve) => {
      try {
        const fullUrlString = `${this.url}?${params.toString()}`;
        const parsedUrl = new URL(fullUrlString);
        
        const options: any = {
          method: 'GET',
          timeout: 15000,
          family: 4, // 🔌 Force IPv4 to resolve legacy DNS issues
          headers: {
            'User-Agent': 'HomeoX-API/1.0',
          }
        };

        const protocol = parsedUrl.protocol === 'https:' ? https : http;
        
        logger.info('[BulkSmsPrime] Connecting to %s (IPv4 forced)', parsedUrl.hostname);

        const req = protocol.get(fullUrlString, options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              logger.info('[BulkSmsPrime] Received response: %s', data);
              resolve({
                messageId: data || `prime-${Date.now()}`,
                status: 'sent'
              });
            } else {
              logger.error('[BulkSmsPrime] HTTP %d — %s', res.statusCode || 0, data);
              resolve({
                messageId: '',
                status: 'failed',
                error: `HTTP ${res.statusCode}: ${data}`
              });
            }
          });
        });

        req.on('error', (err: any) => {
          logger.error('[BulkSmsPrime] Connection failed: %s', err.message);
          
          // 🔄 One last-ditch fallback: if hostname resolution failed, it might be a temporary DNS glitch
          // or a truly unreachable host.
          resolve({
            messageId: '',
            status: 'failed',
            error: `Network Error: ${err.message}. Please verify the SMS_API_URL in .env`
          });
        });

        req.on('timeout', () => {
          req.destroy();
          logger.error('[BulkSmsPrime] Request timed out');
          resolve({ messageId: '', status: 'failed', error: 'Request timed out' });
        });

      } catch (err: any) {
        logger.error('[BulkSmsPrime] Unexpected error: %s', err.message);
        resolve({ messageId: '', status: 'failed', error: err.message });
      }
    });
  }

  async sendBatch(payloads: SmsPayload[]): Promise<SmsGatewayResult[]> {
    return Promise.all(payloads.map(p => this.send(p)));
  }
}
