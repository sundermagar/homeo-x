/**
 * WhatsApp Gateway Port
 */

export interface WhatsAppPayload {
  phone: string;       // Recipient phone number (with country code)
  message: string;     // The text message
  instanceId?: string; // Optional specific instance to send from
  tenantSlug?: string; // Optional tenant slug to resolve instance from env
  mediaUrl?: string;   // Optional URL for media (image/pdf)
  mediaType?: 'image' | 'pdf' | 'video' | 'document';
}

export interface WhatsAppGatewayResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WhatsAppQRResult {
  success: boolean;
  qrCode?: string;     // Base64 image data
  instanceId?: string;
  error?: string;
}

export interface WhatsAppStatusResult {
  success: boolean;
  connected: boolean;
  error?: string;
}

export interface WhatsAppGateway {
  readonly name: string;
  send(payload: WhatsAppPayload): Promise<WhatsAppGatewayResult>;
  sendBatch(payloads: WhatsAppPayload[]): Promise<WhatsAppGatewayResult[]>;
  getQrCode(): Promise<WhatsAppQRResult>;
  checkStatus(instanceId: string): Promise<WhatsAppStatusResult>;
}
