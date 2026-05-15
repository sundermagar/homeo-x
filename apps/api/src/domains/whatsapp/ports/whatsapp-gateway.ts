export interface WhatsAppGateway {
  sendText(channelId: number | null, to: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
  sendTemplate(channelId: number | null, to: string, templateName: string, language: string, components: any[]): Promise<{ success: boolean; messageId?: string; error?: string }>;
  getTemplates(channelId: number | null): Promise<any[]>;
  uploadMedia(channelId: number | null, file: Buffer, fileName: string, mimeType: string): Promise<string>;
  registerWebhook(channelId: number | null, callbackUrl: string, verifyToken: string): Promise<boolean>;
}
