export interface WhatsAppGateway {
  sendText(channelId: number | null, to: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
  sendTemplate(channelId: number | null, to: string, templateName: string, language: string, components: any[]): Promise<{ success: boolean; messageId?: string; error?: string }>;
  getTemplates(channelId: number | null): Promise<any[]>;
  uploadMedia(channelId: number | null, file: Buffer, fileName: string, mimeType: string): Promise<string>;
  sendMedia(channelId: number | null, to: string, mediaId: string, mediaType: 'image' | 'video' | 'audio' | 'document', fileName?: string, caption?: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
  sendReaction(channelId: number | null, to: string, messageId: string, emoji: string): Promise<{ success: boolean; error?: string }>;
  registerWebhook(channelId: number | null, callbackUrl: string, verifyToken: string): Promise<boolean>;
}
