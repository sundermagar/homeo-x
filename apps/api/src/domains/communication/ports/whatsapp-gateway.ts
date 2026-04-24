/**
 * WhatsApp Gateway Port
 */

export interface WhatsAppPayload {
  phone: string;     // Recipient phone number (with country code)
  message: string;   // The text message
  instanceId?: string; // Optional specific instance to send from
}

export interface WhatsAppGatewayResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WhatsAppGateway {
  readonly name: string;
  send(payload: WhatsAppPayload): Promise<WhatsAppGatewayResult>;
  sendBatch(payloads: WhatsAppPayload[]): Promise<WhatsAppGatewayResult[]>;
}
