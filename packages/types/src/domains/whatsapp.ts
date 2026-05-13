export interface WhatsAppChannel {
  id: number;
  clinicId: number;
  name: string;
  phoneNumber: string;
  whatsappBusinessAccountId: string;
  phoneNumberId: string;
  accessToken: string;
  isActive: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppTemplate {
  name: string;
  language: string;
  category: string;
  status: string;
  body: string;
  mediaType: 'text' | 'image' | 'video' | 'document' | 'location';
  header?: string;
  footer?: string;
  buttons?: any[];
  variables?: string[];
}

export interface WhatsAppConversation {
  id: number;
  clinicId: number;
  channelId: number;
  contactPhone: string;
  contactName?: string;
  status: 'open' | 'resolved';
  unreadCount: number;
  lastMessageAt: string;
  lastMessageText: string;
}

export interface WhatsAppMessage {
  id: number;
  conversationId: number;
  whatsappMessageId: string;
  direction: 'inbound' | 'outbound';
  content: string;
  type: string;
  status: string;
  timestamp: string;
}

export interface WhatsAppAnalytics {
  totalDeliveries: number;
  activeConversations: number;
  campaignReach: number;
}

export interface WhatsAppCampaign {
  id: number;
  clinicId: number;
  channelId: number;
  name: string;
  type: string;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
}
