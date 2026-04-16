/**
 * MSG91 SMS Gateway Adapter
 *
 * Docs: https://msg91.com/api/v4/help
 * Requires env vars:
 *   MSG91_API_KEY      — your auth key
 *   MSG91_SENDER_ID   — 6-char sender (default: HMCLIN)
 *   MSG91_ROUTE       — 1=Transactional, 4=Promotional (default: 1)
 */

import type { SmsGateway, SmsPayload, SmsGatewayResult } from '../../domains/communication/ports/sms-gateway';
import { createLogger } from '../../shared/logger';

const logger = createLogger('msg91-gateway');

function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith('91') && digits.length === 12) return digits;
  if (digits.startsWith('+')) return digits.slice(1);
  return digits;
}

export class Msg91SmsGateway implements SmsGateway {
  readonly name = 'MSG91';

  private readonly apiKey: string;
  private readonly senderId: string;
  private readonly route: string;

  constructor() {
    this.apiKey   = process.env.MSG91_API_KEY   ?? '';
    this.senderId = process.env.MSG91_SENDER_ID  ?? 'HMCLIN';
    this.route    = process.env.MSG91_ROUTE      ?? '1';
  }

  private get isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async send(payload: SmsPayload): Promise<SmsGatewayResult> {
    if (!this.isConfigured) {
      logger.warn('[MSG91] Not configured — simulating send to %s', payload.phone);
      return { messageId: `mock-${Date.now()}`, status: 'queued' };
    }

    const phone = normalisePhone(payload.phone);
    const url = `https://api.msg91.com/api/v5/flow`;

    const body: any = payload.templateId ? {
      template_id: payload.templateId,
      recipients: [{
        mobiles: phone,
        ...(payload.variables || {})
      }]
    } : {
      sender:      payload.senderId ?? this.senderId,
      route:       this.route,
      country:     '91',
      sms: [{ message: payload.message, to: [phone] }]
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authkey': this.apiKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        const err = await res.text();
        logger.error('[MSG91] HTTP %d — %s', res.status, err);
        return { messageId: '', status: 'failed', error: `HTTP ${res.status}: ${err}` };
      }

      const json = await res.json() as any;
      logger.info('[MSG91] Sent to %s — messageId=%s', phone, json.message_id ?? json.id);
      return {
        messageId: String(json.message_id ?? json.id ?? 'unknown'),
        status: 'sent',
      };
    } catch (err: any) {
      logger.error('[MSG91] Network error sending to %s: %s', phone, err.message);
      return { messageId: '', status: 'failed', error: err.message };
    }
  }

  async sendBatch(payloads: SmsPayload[]): Promise<SmsGatewayResult[]> {
    // MSG91 bulk API — but we parallelise single sends for reliability
    return Promise.all(payloads.map(p => this.send(p)));
  }
}

/** Null gateway used when no provider is configured — logs only */
export class MockSmsGateway implements SmsGateway {
  readonly name = 'Mock';

  async send(payload: SmsPayload): Promise<SmsGatewayResult> {
    logger.info('[MockSMS] To: %s | Message: %s', payload.phone, payload.message);
    return { messageId: `mock-${Date.now()}`, status: 'queued' };
  }

  async sendBatch(payloads: SmsPayload[]): Promise<SmsGatewayResult[]> {
    return Promise.all(payloads.map(p => this.send(p)));
  }
}

/** Factory — picks the right gateway based on env */
export function createSmsGateway(): SmsGateway {
  if (process.env.SMS_GATEWAY === 'mock' || !process.env.MSG91_API_KEY) {
    logger.warn('SMS gateway running in MOCK mode. Set MSG91_API_KEY to send real SMS.');
    return new MockSmsGateway();
  }
  return new Msg91SmsGateway();
}
