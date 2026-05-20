import type { 
  waChannels, waTemplates, waCampaigns, waCampaignRecipients, waConversations, waMessages, waAutomations 
} from '@mmc/database';

export interface WhatsAppRepository {
  // Channels
  findChannelById(id: number): Promise<any>;
  findChannelByPhoneNumberId(phoneNumberId: string): Promise<any>;
  listChannels(clinicId?: number): Promise<any[]>;
  findDefaultChannel(clinicId: number): Promise<any | null>;
  saveChannel(data: any): Promise<any>;

  // Templates
  findTemplateById(id: number): Promise<any>;
  findTemplateByWhatsappId(whatsappTemplateId: string, channelId: number): Promise<any>;
  listTemplates(channelId: number): Promise<any[]>;
  saveTemplate(data: any): Promise<any>;
  upsertTemplate(data: any): Promise<{ row: any; action: 'created' | 'updated' | 'unchanged' }>;

  // Campaigns
  findCampaignById(id: number): Promise<any>;
  listCampaigns(clinicId: number, params?: { page?: number; limit?: number; search?: string }): Promise<{ data: any[]; total: number }>;
  saveCampaign(data: any): Promise<any>;
  deleteCampaign(id: number): Promise<void>;
  updateCampaignStats(campaignId: number, stats: Partial<any>): Promise<void>;

  // Recipients
  listRecipients(campaignId: number): Promise<any[]>;
  saveRecipient(data: any): Promise<any>;
  updateRecipientStatus(messageId: string, status: string, details?: any): Promise<void>;

  // Conversations
  findConversationById(id: number): Promise<any>;
  findConversationByPhone(channelId: number, phone: string): Promise<any>;
  listConversations(channelId: number): Promise<any[]>;
  saveConversation(data: any): Promise<any>;

  // Messages
  saveMessage(data: any): Promise<any>;
  listMessages(conversationId: number): Promise<any[]>;
  findMessageByWhatsappId(whatsappId: string): Promise<any>;

  // Automations
  listAutomations(clinicId: number, params?: { page?: number; limit?: number }): Promise<{ data: any[]; total: number }>;
  findAutomationById(id: number): Promise<any>;
  saveAutomation(data: any): Promise<any>;

  // Contacts & Groups
  listContacts(clinicId: number, params?: { page?: number; limit?: number; search?: string }): Promise<{ data: any[]; total: number }>;
  saveContact(data: any): Promise<any>;
  deleteContact(id: number): Promise<boolean>;
  listGroups(clinicId: number): Promise<any[]>;
  saveGroup(data: any): Promise<any>;
  addContactToGroup(contactId: number, groupId: number): Promise<void>;

  // Media Library
  listMedia(clinicId: number, params?: { page?: number; limit?: number; search?: string }): Promise<{ data: any[]; total: number }>;
  saveMedia(data: any): Promise<any>;
  findMediaById(id: number): Promise<any>;

  // Chatbots & Training
  listChatbots(clinicId: number, params?: { page?: number; limit?: number }): Promise<{ data: any[]; total: number }>;
  findChatbotById(id: number): Promise<any>;
  saveChatbot(data: any): Promise<any>;
  listTrainingData(chatbotId: number): Promise<any[]>;
  saveTrainingData(data: any): Promise<any>;

  // AI Settings
  findAiSettings(channelId: number): Promise<any>;
  saveAiSettings(data: any): Promise<any>;

  // Training Sources
  listTrainingSources(channelId: number): Promise<any[]>;
  findTrainingSourceById(id: number): Promise<any>;
  saveTrainingSource(data: any): Promise<any>;
  deleteTrainingSource(id: number): Promise<void>;

  // Training Chunks
  listTrainingChunks(sourceId: number): Promise<any[]>;
  saveTrainingChunk(data: any): Promise<any>;
  deleteChunksBySource(sourceId: number): Promise<void>;

  // Training QA Pairs
  listTrainingQaPairs(channelId: number): Promise<any[]>;
  saveTrainingQaPair(data: any): Promise<any>;
  deleteTrainingQaPair(id: number): Promise<void>;

  // Analytics
  getAnalytics(clinicId: number, days?: number): Promise<any>;
}
