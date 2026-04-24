/**
 * SMS Gateway Port
 *
 * Plugs into any SMS provider: MSG91, Twilio, BulkShooters, etc.
 * Swap implementations by swapping the adapter class.
 */

export interface SmsGatewayResult {
  messageId: string;   // Provider's reference ID
  status: 'queued' | 'sent' | 'failed';
  error?: string;
}

export interface SmsPayload {
  phone: string;   // E.164 or 10-digit (provider normalises)
  message: string;
  senderId?: string;
  entityId?: string;
  templateId?: string;   // DLT template ID for transactional SMS
  variables?: Record<string, string>; // Values for template placeholders
}

export interface SmsGateway {
  readonly name: string;
  send(payload: SmsPayload): Promise<SmsGatewayResult>;
  sendBatch(payloads: SmsPayload[]): Promise<SmsGatewayResult[]>;
}
