export interface WhatsAppGateway {
  sendText(channelId: number, to: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
  sendTemplate(channelId: number, to: string, templateName: string, language: string, components: any[]): Promise<{ success: boolean; messageId?: string; error?: string }>;
  getTemplates(channelId: number): Promise<any[]>;
  uploadMedia(channelId: number, file: Buffer, fileName: string, mimeType: string): Promise<string>;
  registerWebhook(channelId: number, callbackUrl: string, verifyToken: string): Promise<boolean>;
}
