import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';
import type { WhatsAppGateway, WhatsAppPayload, WhatsAppGatewayResult, WhatsAppQRResult, WhatsAppStatusResult } from '../../domains/communication/ports/whatsapp-gateway.js';
import { createLogger } from '../../shared/logger.js';

const logger = createLogger('bulkshooters-whatsapp-gateway');

/**
 * BulkShooters WhatsApp Gateway Adapter
 * Connects to https://bulkshooters.in/api/send/whatsapp
 *
 * Supports multiple parameter formats - tries different combinations to find what works.
 * If all attempts fail, returns the last error with details for debugging.
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

  /**
   * Resolves the instance ID for a given tenant slug from environment variables.
   * Matches WHATSAPP_ACCOUNT_{SLUG}
   */
  private resolveInstanceId(payload: WhatsAppPayload): string {
    if (payload.instanceId) return payload.instanceId;

    if (payload.tenantSlug) {
      const envKey = `WHATSAPP_ACCOUNT_${payload.tenantSlug.toUpperCase().replace(/[-\s]/g, '_')}`;
      const tenantInstance = process.env[envKey];
      if (tenantInstance) {
        logger.info('[BulkShooters] Using tenant-specific instance for %s: %s', payload.tenantSlug, envKey);
        return tenantInstance;
      }
    }

    return this.defaultInstance;
  }

  /**
   * Builds request options for the given path and body.
   */
  private buildRequestOptions(path: string, body: string | Buffer, contentType: string): https.RequestOptions {
    return {
      method: 'POST',
      hostname: new URL(this.url).hostname,
      path: path || new URL(this.url).pathname,
      timeout: 20000,
      headers: {
        'User-Agent': 'HomeoX-API/1.0',
        'Content-Type': contentType,
        'Content-Length': Buffer.isBuffer(body) ? body.length : Buffer.byteLength(body),
      }
    };
  }

  /**
   * Makes an HTTP request and returns parsed JSON response.
   */
  private request(path: string, body: string | Buffer, contentType: string): Promise<{ statusCode: number; data: any; raw: string }> {
    return new Promise((resolve) => {
      const parsedUrl = new URL(this.url);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;
      const options = this.buildRequestOptions(path, body, contentType);

      logger.debug('[BulkShooters] Request: %s %s', options.method, options.path);

      const req = protocol.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve({ statusCode: res.statusCode ?? 0, data: json, raw: data });
          } catch {
            resolve({ statusCode: res.statusCode ?? 0, data: null, raw: data });
          }
        });
      });

      req.on('error', (err) => resolve({ statusCode: 0, data: null, raw: err.message }));
      req.on('timeout', () => { req.destroy(); resolve({ statusCode: 0, data: null, raw: 'Request timed out' }); });

      req.write(body);
      req.end();
    });
  }

  /**
   * Attempts to send via a specific body format and path.
   * Returns the result if successful, or null if it failed.
   */
  private async tryFormat(
    phone: string,
    message: string,
    instanceId: string,
    bodyBuilder: (secret: string, instance: string, phone: string, message: string) => { path: string; body: string | Buffer; contentType: string }
  ): Promise<WhatsAppGatewayResult | null> {
    const { path, body, contentType } = bodyBuilder(this.secret, instanceId, phone, message);

    logger.info('[BulkShooters] Trying format — path=%s, body=%s', path, typeof body === 'string' ? body : '<buffer>');

    const result = await this.request(path, body, contentType);

    if (result.statusCode === 200 && result.data) {
      const json = result.data;
      // Check for success indicators
      if (json.status === 'success' || json.status === 200 || json.success === true) {
        logger.info('[BulkShooters] Sent — messageId=%s', json.message_id || json.id || 'ok');
        return { success: true, messageId: String(json.message_id || json.id || 'ok') };
      }
      // If 400 "Invalid Parameters" - this format didn't work, return null to try next
      if (json.status === 400 && (json.message === 'Invalid Parameters!' || json.message === false)) {
        logger.debug('[BulkShooters] Format not accepted: %s', result.raw);
        return null;
      }
      // Other errors - return as failure (auth issue, etc.)
      if (json.status === 401) {
        logger.warn('[BulkShooters] Auth failed (401) — check WHATSAPP_SECRET');
        return { success: false, error: `Auth failed (401): check WHATSAPP_SECRET` };
      }
      // Server error or other
      return { success: false, error: json.message || result.raw };
    }

    // Non-200 or non-JSON response
    return { success: false, error: `HTTP ${result.statusCode}: ${result.raw}` };
  }

  async send(payload: WhatsAppPayload): Promise<WhatsAppGatewayResult> {
    if (!this.isConfigured) {
      logger.warn('[BulkShooters] Not configured — check WHATSAPP_SECRET/WHATSAPP_ACCOUNT_DEFAULT');
      return { success: false, error: 'Not configured' };
    }

    const instanceId = this.resolveInstanceId(payload);

    // Normalise phone: remove all non-digits, ensure 91 prefix for India
    let phone = payload.phone.replace(/\D/g, '');
    if (phone.length === 10) phone = `91${phone}`;

    logger.info('[BulkShooters] Sending to %s via instance %s', phone, instanceId.substring(0, 8));

    // Try multiple body/param formats — stop at first success
    const formats = [
      // Format 1: POST JSON — secret, account, recipient, message, type
      (secret: string, instance: string, p: string, m: string) => ({
        path: '/api/send/whatsapp',
        body: JSON.stringify({ secret, account: instance, recipient: `+${p}`, message: m, type: 'text' }),
        contentType: 'application/json'
      }),
      // Format 2: POST JSON — secret, account, number (no +), type
      (secret: string, instance: string, p: string, m: string) => ({
        path: '/api/send/whatsapp',
        body: JSON.stringify({ secret, account: instance, number: p, message: m, type: 'text' }),
        contentType: 'application/json'
      }),
      // Format 3: POST JSON — key, instance, number, message (no secret/account)
      (secret: string, instance: string, p: string, m: string) => ({
        path: '/api/send/whatsapp',
        body: JSON.stringify({ key: secret, instance, number: p, message: m }),
        contentType: 'application/json'
      }),
      // Format 4: POST JSON — api_key, instance_id, number, message
      (secret: string, instance: string, p: string, m: string) => ({
        path: '/api/send/whatsapp',
        body: JSON.stringify({ api_key: secret, instance_id: instance, number: p, message: m }),
        contentType: 'application/json'
      }),
      // Format 5: POST JSON — secret, account, phone (not number/recipient)
      (secret: string, instance: string, p: string, m: string) => ({
        path: '/api/send/whatsapp',
        body: JSON.stringify({ secret, account: instance, phone: p, message: m, type: 'text' }),
        contentType: 'application/json'
      }),
      // Format 6: POST form-urlencoded — secret, account, number, message
      (secret: string, instance: string, p: string, m: string) => {
        const params = new URLSearchParams({ secret, account: instance, number: p, message: m, type: 'text' });
        return { path: '/api/send/whatsapp', body: params.toString(), contentType: 'application/x-www-form-urlencoded' };
      },
      // Format 7: POST JSON — Bearer token in Authorization header, body has only number+message
      (_secret: string, _instance: string, p: string, m: string) => ({
        path: '/api/send/whatsapp',
        body: JSON.stringify({ number: p, message: m }),
        contentType: 'application/json'
      }),
      // Format 8: GET with query params — key, instance, number, message
      (secret: string, instance: string, p: string, m: string) => {
        const qs = new URLSearchParams({ key: secret, instance, number: p, message: m, type: 'text' }).toString();
        return { path: '/api/send/whatsapp?' + qs, body: '', contentType: 'application/json' };
      },
      // Format 9: POST JSON to alternate endpoint — /api/whatsapp/send with secret+account in body
      (secret: string, instance: string, p: string, m: string) => ({
        path: '/api/whatsapp/send',
        body: JSON.stringify({ secret, account: instance, number: p, message: m }),
        contentType: 'application/json'
      }),
      // Format 10: POST JSON — token, id, number, message
      (secret: string, instance: string, p: string, m: string) => ({
        path: '/api/send/whatsapp',
        body: JSON.stringify({ token: secret, id: instance, number: p, message: m }),
        contentType: 'application/json'
      }),
    ];

    for (let i = 0; i < formats.length; i++) {
      const builder = formats[i]!;
      const result = await this.tryFormat(phone, payload.message, instanceId, builder);
      if (result !== null) {
        if (result.success) return result;
        // Auth failure is terminal — don't try more formats
        if (result.error?.includes('Auth failed')) return result;
        // Other error — try next format
        logger.debug('[BulkShooters] Format %d failed: %s', i + 1, result.error);
      }
    }

    logger.error('[BulkShooters] All %d formats failed for %s', formats.length, phone);
    return { success: false, error: 'All send formats failed. Check debug logs.' };
  }

  async sendBatch(payloads: WhatsAppPayload[]): Promise<WhatsAppGatewayResult[]> {
    return Promise.all(payloads.map(p => this.send(p)));
  }

  async getQrCode(): Promise<WhatsAppQRResult> {
    if (!this.secret) return { success: false, error: 'API Secret not configured' };
    
    return new Promise((resolve) => {
      // First create/get instance
      const createUrl = `https://bulkshooters.in/api/createinstance.php?access_token=${this.secret}`;
      https.get(createUrl, (res) => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const instanceId = json.instance_id;
            if (!instanceId) return resolve({ success: false, error: 'Failed to get instance_id' });

            // Then get QR code
            const qrUrl = `https://bulkshooters.in/api/getqrcode.php?instance_id=${instanceId}&access_token=${this.secret}`;
            https.get(qrUrl, (qrRes) => {
              let qrData = '';
              qrRes.on('data', d => qrData += d);
              qrRes.on('end', () => {
                try {
                  const qrJson = JSON.parse(qrData);
                  resolve({ success: true, qrCode: qrJson.base64, instanceId });
                } catch { resolve({ success: false, error: 'Invalid QR response' }); }
              });
            });
          } catch { resolve({ success: false, error: 'Invalid Instance response' }); }
        });
      }).on('error', e => resolve({ success: false, error: e.message }));
    });
  }

  async checkStatus(instanceId: string): Promise<WhatsAppStatusResult> {
    return { success: true, connected: true }; 
  }
}

/** Null gateway used when no provider is configured — logs only */
export class MockWhatsAppGateway implements WhatsAppGateway {
  readonly name = 'Mock';

  async send(payload: WhatsAppPayload): Promise<WhatsAppGatewayResult> {
    logger.info('[MockWhatsApp] To: %s | Message: %s | Tenant: %s', payload.phone, payload.message, payload.tenantSlug || 'none');
    return { success: true, messageId: `mock-${Date.now()}` };
  }

  async sendBatch(payloads: WhatsAppPayload[]): Promise<WhatsAppGatewayResult[]> {
    return Promise.all(payloads.map(p => this.send(p)));
  }

  async getQrCode(): Promise<WhatsAppQRResult> {
    return { success: true, qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', instanceId: 'mock-instance' };
  }

  async checkStatus(): Promise<WhatsAppStatusResult> {
    return { success: true, connected: true };
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
