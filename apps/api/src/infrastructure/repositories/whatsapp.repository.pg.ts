import { eq, and, sql, desc, isNull, ilike, gte } from 'drizzle-orm';
import type { DbClient } from '@mmc/database';
import * as schema from '@mmc/database';
import type { WhatsAppRepository } from '../../domains/whatsapp/ports/whatsapp.repository.js';

export class WhatsAppRepositoryPG implements WhatsAppRepository {
  constructor(private readonly db: DbClient) { }

  // ─── Channels ─────────────────────────────────────────────────────────────

  async findChannelById(id: number): Promise<any> {
    const [row] = await this.db
      .select()
      .from(schema.waChannels)
      .where(eq(schema.waChannels.id, id))
      .limit(1);
    return row ?? null;
  }

  async findChannelByPhoneNumberId(phoneNumberId: string): Promise<any> {
    const [row] = await this.db
      .select()
      .from(schema.waChannels)
      .where(eq(schema.waChannels.phoneNumberId, phoneNumberId))
      .limit(1);
    return row ?? null;
  }

  async listChannels(clinicId?: number): Promise<any[]> {
    const query = this.db.select().from(schema.waChannels);
    if (clinicId) {
      query.where(eq(schema.waChannels.clinicId, clinicId));
    }
    return query.orderBy(desc(schema.waChannels.createdAt));
  }

  async findDefaultChannel(clinicId: number): Promise<any | null> {
    const [row] = await this.db
      .select()
      .from(schema.waChannels)
      .where(and(
        eq(schema.waChannels.clinicId, clinicId),
        eq(schema.waChannels.isActive, true)
      ))
      .orderBy(desc(schema.waChannels.createdAt))
      .limit(1);
    return row ?? null;
  }

  async saveChannel(data: any): Promise<any> {
    if (data.id) {
      const [row] = await this.db
        .update(schema.waChannels)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.waChannels.id, data.id))
        .returning();
      return row;
    }
    const [row] = await this.db
      .insert(schema.waChannels)
      .values(data)
      .returning();
    return row;
  }

  // ─── Templates ────────────────────────────────────────────────────────────

  async findTemplateById(id: number): Promise<any> {
    const [row] = await this.db
      .select()
      .from(schema.waTemplates)
      .where(eq(schema.waTemplates.id, id))
      .limit(1);
    return row ?? null;
  }

  async listTemplates(channelId: number): Promise<any[]> {
    return this.db
      .select()
      .from(schema.waTemplates)
      .where(eq(schema.waTemplates.channelId, channelId))
      .orderBy(desc(schema.waTemplates.createdAt));
  }

  async saveTemplate(data: any): Promise<any> {
    if (data.id) {
      const [row] = await this.db
        .update(schema.waTemplates)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.waTemplates.id, data.id))
        .returning();
      return row;
    }
    const [row] = await this.db
      .insert(schema.waTemplates)
      .values(data)
      .returning();
    return row;
  }

  async findTemplateByWhatsappId(whatsappTemplateId: string, channelId: number): Promise<any> {
    const [row] = await this.db
      .select()
      .from(schema.waTemplates)
      .where(and(
        eq(schema.waTemplates.whatsappTemplateId, whatsappTemplateId),
        eq(schema.waTemplates.channelId, channelId)
      ))
      .limit(1);
    return row ?? null;
  }

  async upsertTemplate(data: any): Promise<{ row: any; action: 'created' | 'updated' | 'unchanged' }> {
    const existing = await this.findTemplateByWhatsappId(data.whatsappTemplateId, data.channelId);
    
    if (existing) {
      // Only update if something changed
      const changed = existing.status !== data.status
        || existing.body !== data.body
        || existing.header !== data.header
        || existing.footer !== data.footer
        || existing.category !== data.category;
      
      if (!changed) {
        return { row: existing, action: 'unchanged' };
      }

      const [row] = await this.db
        .update(schema.waTemplates)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.waTemplates.id, existing.id))
        .returning();
      return { row, action: 'updated' };
    }

    const [row] = await this.db
      .insert(schema.waTemplates)
      .values(data)
      .returning();
    return { row, action: 'created' };
  }

  // ─── Campaigns ─────────────────────────────────────────────────────────────

  async findCampaignById(id: number): Promise<any> {
    const [row] = await this.db
      .select()
      .from(schema.waCampaigns)
      .where(eq(schema.waCampaigns.id, id))
      .limit(1);
    return row ?? null;
  }

  async listCampaigns(clinicId: number, params?: { page?: number; limit?: number; search?: string }): Promise<{ data: any[]; total: number }> {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const offset = (page - 1) * limit;
    
    let query = this.db.select().from(schema.waCampaigns).where(eq(schema.waCampaigns.clinicId, clinicId));
    
    if (params?.search) {
      query = this.db.select().from(schema.waCampaigns).where(
        and(
          eq(schema.waCampaigns.clinicId, clinicId),
          ilike(schema.waCampaigns.name, `%${params.search}%`)
        )
      ) as any;
    }

    const data = await (query as any).orderBy(desc(schema.waCampaigns.createdAt)).limit(limit).offset(offset);
    
    const [totalRes] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.waCampaigns)
      .where(eq(schema.waCampaigns.clinicId, clinicId));

    return { data, total: Number(totalRes?.count || 0) };
  }

  async saveCampaign(data: any): Promise<any> {
    if (data.id) {
      const [row] = await this.db
        .update(schema.waCampaigns)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.waCampaigns.id, data.id))
        .returning();
      return row;
    }
    const [row] = await this.db
      .insert(schema.waCampaigns)
      .values(data)
      .returning();
    return row;
  }

  async updateCampaignStats(campaignId: number, stats: Partial<any>): Promise<void> {
    await this.db
      .update(schema.waCampaigns)
      .set({ ...stats, updatedAt: new Date() })
      .where(eq(schema.waCampaigns.id, campaignId));
  }

  // ─── Recipients ────────────────────────────────────────────────────────────

  async listRecipients(campaignId: number): Promise<any[]> {
    return this.db
      .select()
      .from(schema.waCampaignRecipients)
      .where(eq(schema.waCampaignRecipients.campaignId, campaignId));
  }

  async saveRecipient(data: any): Promise<any> {
    if (data.id) {
      const [row] = await this.db
        .update(schema.waCampaignRecipients)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.waCampaignRecipients.id, data.id))
        .returning();
      return row;
    }
    const [row] = await this.db
      .insert(schema.waCampaignRecipients)
      .values(data)
      .returning();
    return row;
  }

  async updateRecipientStatus(messageId: string, status: any, details?: any): Promise<void> {
    const updateData: any = { status, updatedAt: new Date() };
    if (status === 'delivered') updateData.deliveredAt = new Date();
    if (status === 'read') updateData.readAt = new Date();
    if (details?.error) {
      updateData.errorCode = details.error.code;
      updateData.errorMessage = details.error.message;
    }

    await this.db
      .update(schema.waCampaignRecipients)
      .set(updateData)
      .where(eq(schema.waCampaignRecipients.whatsappMessageId, messageId));
  }

  // ─── Conversations ──────────────────────────────────────────────────────────

  async findConversationById(id: number): Promise<any> {
    const [row] = await this.db
      .select()
      .from(schema.waConversations)
      .where(eq(schema.waConversations.id, id))
      .limit(1);
    return row ?? null;
  }

  async findConversationByPhone(channelId: number, phone: string): Promise<any> {
    const [row] = await this.db
      .select()
      .from(schema.waConversations)
      .where(and(
        eq(schema.waConversations.channelId, channelId),
        eq(schema.waConversations.contactPhone, phone)
      ))
      .limit(1);
    return row ?? null;
  }

  async listConversations(channelId: number): Promise<any[]> {
    return this.db
      .select()
      .from(schema.waConversations)
      .where(eq(schema.waConversations.channelId, channelId))
      .orderBy(desc(schema.waConversations.lastMessageAt));
  }

  async saveConversation(data: any): Promise<any> {
    if (data.id) {
      const [row] = await this.db
        .update(schema.waConversations)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.waConversations.id, data.id))
        .returning();
      return row;
    }
    const [row] = await this.db
      .insert(schema.waConversations)
      .values(data)
      .returning();
    return row;
  }

  // ─── Messages ───────────────────────────────────────────────────────────────

  async saveMessage(data: any): Promise<any> {
    if (data.id) {
      const [row] = await this.db
        .update(schema.waMessages)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.waMessages.id, data.id))
        .returning();
      return row;
    }
    const [row] = await this.db
      .insert(schema.waMessages)
      .values(data)
      .returning();
    return row;
  }

  async listMessages(conversationId: number): Promise<any[]> {
    return this.db
      .select()
      .from(schema.waMessages)
      .where(eq(schema.waMessages.conversationId, conversationId))
      .orderBy(desc(schema.waMessages.createdAt));
  }

  async findMessageByWhatsappId(whatsappId: string): Promise<any> {
    const [row] = await this.db
      .select()
      .from(schema.waMessages)
      .where(eq(schema.waMessages.whatsappMessageId, whatsappId))
      .limit(1);
    return row ?? null;
  }

  // ─── Contacts & Groups ──────────────────────────────────────────────────────

  async listContacts(clinicId: number, params?: { page?: number; limit?: number; search?: string }): Promise<{ data: any[]; total: number }> {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const offset = (page - 1) * limit;
    
    let filters = [eq(schema.waContacts.clinicId, clinicId)];
    if (params?.search) {
      filters.push(ilike(schema.waContacts.name, `%${params.search}%`));
    }

    const data = await this.db
      .select()
      .from(schema.waContacts)
      .where(and(...filters))
      .orderBy(desc(schema.waContacts.createdAt))
      .limit(limit)
      .offset(offset);
    
    const [totalRes] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.waContacts)
      .where(and(...filters));

    return { data, total: Number(totalRes?.count || 0) };
  }

  async saveContact(data: any): Promise<any> {
    if (data.id) {
      const [row] = await this.db
        .update(schema.waContacts)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.waContacts.id, data.id))
        .returning();
      return row;
    }
    const [row] = await this.db
      .insert(schema.waContacts)
      .values(data)
      .returning();
    return row;
  }

  async listGroups(clinicId: number): Promise<any[]> {
    return this.db
      .select()
      .from(schema.waContactGroups)
      .where(eq(schema.waContactGroups.clinicId, clinicId))
      .orderBy(desc(schema.waContactGroups.createdAt));
  }

  async saveGroup(data: any): Promise<any> {
    if (data.id) {
      const [row] = await this.db
        .update(schema.waContactGroups)
        .set({ ...data })
        .where(eq(schema.waContactGroups.id, data.id))
        .returning();
      return row;
    }
    const [row] = await this.db
      .insert(schema.waContactGroups)
      .values(data)
      .returning();
    return row;
  }

  async addContactToGroup(contactId: number, groupId: number): Promise<void> {
    await this.db
      .insert(schema.waContactGroupMembers)
      .values({ contactId, groupId });
  }

  // ─── Media Library ───────────────────────────────────────────────────────────

  async listMedia(clinicId: number, params?: { page?: number; limit?: number; search?: string }): Promise<{ data: any[]; total: number }> {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const offset = (page - 1) * limit;
    
    let filters = [eq(schema.waMedia.clinicId, clinicId)];
    if (params?.search) {
      filters.push(ilike(schema.waMedia.name, `%${params.search}%`));
    }

    const data = await this.db
      .select()
      .from(schema.waMedia)
      .where(and(...filters))
      .orderBy(desc(schema.waMedia.createdAt))
      .limit(limit)
      .offset(offset);
    
    const [totalRes] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.waMedia)
      .where(and(...filters));

    return { data, total: Number(totalRes?.count || 0) };
  }

  async saveMedia(data: any): Promise<any> {
    if (data.id) {
      const [row] = await this.db
        .update(schema.waMedia)
        .set(data)
        .where(eq(schema.waMedia.id, data.id))
        .returning();
      return row;
    }
    const [row] = await this.db
      .insert(schema.waMedia)
      .values(data)
      .returning();
    return row;
  }

  async findMediaById(id: number): Promise<any> {
    const [row] = await this.db
      .select()
      .from(schema.waMedia)
      .where(eq(schema.waMedia.id, id))
      .limit(1);
    return row ?? null;
  }

  // ─── Chatbots & Training ─────────────────────────────────────────────────────

  async listChatbots(clinicId: number, params?: { page?: number; limit?: number }): Promise<{ data: any[]; total: number }> {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const offset = (page - 1) * limit;
    
    const data = await this.db
      .select()
      .from(schema.waChatbots)
      .where(eq(schema.waChatbots.clinicId, clinicId))
      .orderBy(desc(schema.waChatbots.createdAt))
      .limit(limit)
      .offset(offset);
    
    const [totalRes] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.waChatbots)
      .where(eq(schema.waChatbots.clinicId, clinicId));

    return { data, total: Number(totalRes?.count || 0) };
  }

  async findChatbotById(id: number): Promise<any> {
    const [row] = await this.db
      .select()
      .from(schema.waChatbots)
      .where(eq(schema.waChatbots.id, id))
      .limit(1);
    return row ?? null;
  }

  async saveChatbot(data: any): Promise<any> {
    if (data.id) {
      const [row] = await this.db
        .update(schema.waChatbots)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.waChatbots.id, data.id))
        .returning();
      return row;
    }
    const [row] = await this.db
      .insert(schema.waChatbots)
      .values({ ...data, uuid: crypto.randomUUID() })
      .returning();
    return row;
  }

  async listTrainingData(chatbotId: number): Promise<any[]> {
    return this.db
      .select()
      .from(schema.waTrainingData)
      .where(eq(schema.waTrainingData.chatbotId, chatbotId))
      .orderBy(desc(schema.waTrainingData.createdAt));
  }

  async saveTrainingData(data: any): Promise<any> {
    const [row] = await this.db
      .insert(schema.waTrainingData)
      .values(data)
      .returning();
    return row;
  }

  // ─── Automations ─────────────────────────────────────────────────────────────

  async listAutomations(clinicId: number, params?: { page?: number; limit?: number }): Promise<{ data: any[]; total: number }> {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const offset = (page - 1) * limit;
    
    const data = await this.db
      .select()
      .from(schema.waAutomations)
      .where(eq(schema.waAutomations.clinicId, clinicId))
      .orderBy(desc(schema.waAutomations.createdAt))
      .limit(limit)
      .offset(offset);
    
    const [totalRes] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.waAutomations)
      .where(eq(schema.waAutomations.clinicId, clinicId));

    return { data, total: Number(totalRes?.count || 0) };
  }

  async findAutomationById(id: number): Promise<any> {
    const [row] = await this.db
      .select()
      .from(schema.waAutomations)
      .where(eq(schema.waAutomations.id, id))
      .limit(1);
    return row ?? null;
  }

  async saveAutomation(data: any): Promise<any> {
    if (data.id) {
      const [row] = await this.db
        .update(schema.waAutomations)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.waAutomations.id, data.id))
        .returning();
      return row;
    }
    const [row] = await this.db
      .insert(schema.waAutomations)
      .values(data)
      .returning();
    return row;
  }

  // ─── Analytics ───────────────────────────────────────────────────────────────

  async getAnalytics(clinicId: number): Promise<any> {
    // Total Deliveries (Successful Campaign Recipient Deliveries)
    const [deliveries] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.waCampaignRecipients)
      .innerJoin(schema.waCampaigns, eq(schema.waCampaigns.id, schema.waCampaignRecipients.campaignId))
      .where(and(
        eq(schema.waCampaigns.clinicId, clinicId),
        eq(schema.waCampaignRecipients.status, 'delivered')
      ));

    // Active Conversations (Conversations with messages in the last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const [conversations] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.waConversations)
      .innerJoin(schema.waChannels, eq(schema.waChannels.id, schema.waConversations.channelId))
      .where(and(
        eq(schema.waChannels.clinicId, clinicId),
        gte(schema.waConversations.lastMessageAt, sevenDaysAgo)
      ));

    // Campaign Reach (Total unique recipients reached)
    const [reach] = await this.db
      .select({ count: sql<number>`count(DISTINCT ${schema.waCampaignRecipients.phone})::int` })
      .from(schema.waCampaignRecipients)
      .innerJoin(schema.waCampaigns, eq(schema.waCampaigns.id, schema.waCampaignRecipients.campaignId))
      .where(eq(schema.waCampaigns.clinicId, clinicId));

    return {
      totalDeliveries: deliveries?.count || 0,
      activeConversations: conversations?.count || 0,
      campaignReach: reach?.count || 0,
      growthRate: 12.5 // Hardcoded for now as it requires historical comparison
    };
  }
}
