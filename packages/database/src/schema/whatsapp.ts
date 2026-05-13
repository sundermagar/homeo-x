import {
  pgTable, serial, integer, varchar, text, timestamp, boolean, jsonb, index, unique, pgEnum, numeric
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─── Enums ──────────────────────────────────────────────────────────────────
export const waCampaignStatusEnum = pgEnum('wa_campaign_status', ['draft', 'scheduled', 'active', 'paused', 'completed']);
export const waRecipientStatusEnum = pgEnum('wa_recipient_status', ['pending', 'sent', 'delivered', 'read', 'failed']);
export const waConversationStatusEnum = pgEnum('wa_conversation_status', ['open', 'closed', 'assigned', 'pending']);
export const waMessageDirectionEnum = pgEnum('wa_message_direction', ['inbound', 'outbound']);
export const waAutomationStatusEnum = pgEnum('wa_automation_status', ['active', 'inactive', 'paused']);

// ─── WhatsApp Channels ──────────────────────────────────────────────────────
export const waChannels = pgTable('wa_channels', {
  id: serial('id').primaryKey(),
  clinicId: integer('clinic_id'), // Link to clinic
  name: text('name').notNull(),
  phoneNumberId: text('phone_number_id').notNull(),
  accessToken: text('access_token').notNull(),
  whatsappBusinessAccountId: text('whatsapp_business_account_id'),
  phoneNumber: text('phone_number'),
  appId: text('app_id'),
  isActive: boolean('is_active').default(true),
  isCoexistence: boolean('is_coexistence').default(false),
  
  // Health status
  healthStatus: text('health_status').default('unknown'), // healthy, warning, error, unknown
  lastHealthCheck: timestamp('last_health_check'),
  healthDetails: jsonb('health_details').default({}),
  
  connectionMethod: varchar('connection_method', { length: 20 }).default('embedded'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: integer('created_by'), // Link to users.id
});

// ─── WhatsApp Templates ─────────────────────────────────────────────────────
export const waTemplates = pgTable('wa_templates', {
  id: serial('id').primaryKey(),
  channelId: integer('channel_id').references(() => waChannels.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: text('category').notNull(), // marketing, transactional, authentication, utility
  language: text('language').default('en_US'),
  header: text('header'),
  body: text('body').notNull(),
  footer: text('footer'),
  buttons: jsonb('buttons').default([]),
  variables: jsonb('variables').default([]),
  status: text('status').default('draft'), // draft, pending, approved, rejected
  rejectionReason: text('rejection_reason'),
  mediaType: text('media_type').default('text'), // text, image, video, document, carousel
  mediaUrl: text('media_url'),
  mediaHandle: text('media_handle'),
  carouselCards: jsonb('carousel_cards').default([]),
  whatsappTemplateId: text('whatsapp_template_id'),
  usageCount: integer('usage_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  templateChannelWaIdUnique: unique('wa_template_channel_wa_id_unique').on(table.whatsappTemplateId, table.channelId),
  templateChannelIdx: index('wa_templates_channel_idx').on(table.channelId),
}));

// ─── Campaigns ──────────────────────────────────────────────────────────────
export const waCampaigns = pgTable('wa_campaigns', {
  id: serial('id').primaryKey(),
  clinicId: integer('clinic_id'),
  channelId: integer('channel_id').references(() => waChannels.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  campaignType: text('campaign_type').notNull(), // contacts, csv, api
  type: text('type').notNull(), // marketing, transactional
  apiType: text('api_type').notNull(), // cloud_api, mm_lite
  templateId: integer('template_id').references(() => waTemplates.id),
  templateName: text('template_name'),
  templateLanguage: text('template_language'),
  variableMapping: jsonb('variable_mapping').default({}),
  contactGroups: jsonb('contact_groups').default([]),
  csvData: jsonb('csv_data').default([]),
  status: waCampaignStatusEnum('status').default('draft'),
  scheduledAt: timestamp('scheduled_at'),
  recipientCount: integer('recipient_count').default(0),
  sentCount: integer('sent_count').default(0),
  deliveredCount: integer('delivered_count').default(0),
  readCount: integer('read_count').default(0),
  repliedCount: integer('replied_count').default(0),
  failedCount: integer('failed_count').default(0),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: integer('created_by'),
}, (table) => ({
  campaignChannelIdx: index('wa_campaigns_channel_idx').on(table.channelId),
  campaignStatusIdx: index('wa_campaigns_status_idx').on(table.status),
}));

// ─── Campaign Recipients ────────────────────────────────────────────────────
export const waCampaignRecipients = pgTable('wa_campaign_recipients', {
  id: serial('id').primaryKey(),
  campaignId: integer('campaign_id').notNull().references(() => waCampaigns.id, { onDelete: 'cascade' }),
  patientId: integer('patient_id'), // Link to patients table if available
  phone: text('phone').notNull(),
  name: text('name'),
  status: waRecipientStatusEnum('status').default('pending'),
  whatsappMessageId: varchar('whatsapp_message_id', { length: 255 }),
  templateParams: jsonb('template_params').default({}),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  readAt: timestamp('read_at'),
  errorCode: varchar('error_code', { length: 50 }),
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  recipientCampaignIdx: index('wa_recipients_campaign_idx').on(table.campaignId),
  recipientStatusIdx: index('wa_recipients_status_idx').on(table.status),
  campaignPhoneUnique: unique('wa_campaign_phone_unique').on(table.campaignId, table.phone),
}));

// ─── Conversations ──────────────────────────────────────────────────────────
export const waConversations = pgTable('wa_conversations', {
  id: serial('id').primaryKey(),
  clinicId: integer('clinic_id'),
  channelId: integer('channel_id').references(() => waChannels.id, { onDelete: 'cascade' }),
  patientId: integer('patient_id'),
  assignedTo: integer('assigned_to'), // Link to users.id
  contactPhone: varchar('contact_phone', { length: 20 }),
  contactName: varchar('contact_name', { length: 200 }),
  status: waConversationStatusEnum('status').default('open'),
  priority: text('priority').default('normal'), // low, normal, high, urgent
  type: text('type').default('whatsapp'),
  chatbotId: integer('chatbot_id'),
  sessionId: text('session_id'),
  tags: jsonb('tags').default([]),
  unreadCount: integer('unread_count').default(0),
  lastMessageAt: timestamp('last_message_at'),
  lastIncomingMessageAt: timestamp('last_incoming_message_at'),
  lastMessageText: text('last_message_text'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  conversationChannelIdx: index('wa_conversations_channel_idx').on(table.channelId),
  conversationPhoneIdx: index('wa_conversations_phone_idx').on(table.contactPhone),
  conversationStatusIdx: index('wa_conversations_status_idx').on(table.status),
}));

// ─── Messages ───────────────────────────────────────────────────────────────
export const waMessages = pgTable('wa_messages', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').references(() => waConversations.id, { onDelete: 'cascade' }),
  whatsappMessageId: varchar('whatsapp_message_id', { length: 255 }),
  direction: waMessageDirectionEnum('direction').default('outbound'),
  content: text('content').notNull(),
  type: text('type').default('text'), // text, image, document, template
  fromType: varchar('from_type', { length: 50 }).default('user'), // user, bot, system
  mediaId: varchar('media_id', { length: 255 }),
  mediaUrl: text('media_url'),
  mediaMimeType: varchar('media_mime_type', { length: 100 }),
  status: text('status').default('sent'), // sent, delivered, read, failed, received
  timestamp: timestamp('timestamp'),
  metadata: jsonb('metadata').default({}),
  deliveredAt: timestamp('delivered_at'),
  readAt: timestamp('read_at'),
  errorCode: varchar('error_code', { length: 50 }),
  errorMessage: text('error_message'),
  campaignId: integer('campaign_id').references(() => waCampaigns.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  messageConversationIdx: index('wa_messages_conversation_idx').on(table.conversationId),
  messageWhatsappIdx: index('wa_messages_whatsapp_idx').on(table.whatsappMessageId),
  messageStatusIdx: index('wa_messages_status_idx').on(table.status),
}));

// ─── Automations ────────────────────────────────────────────────────────────
export const waAutomations = pgTable('wa_automations', {
  id: serial('id').primaryKey(),
  clinicId: integer('clinic_id'),
  channelId: integer('channel_id').references(() => waChannels.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  trigger: text('trigger').notNull(), // message_received, keyword, schedule, api_webhook
  triggerConfig: jsonb('trigger_config').default({}),
  status: waAutomationStatusEnum('status').default('inactive'),
  executionCount: integer('execution_count').default(0),
  lastExecutedAt: timestamp('last_executed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: integer('created_by'),
});

// ─── Chatbots ───────────────────────────────────────────────────────────────
export const waChatbots = pgTable('wa_chatbots', {
  id: serial('id').primaryKey(),
  clinicId: integer('clinic_id'),
  uuid: text('uuid').notNull().unique(),
  title: text('title').notNull(),
  welcomeMessage: text('welcome_message'),
  instructions: text('instructions'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Training Data ──────────────────────────────────────────────────────────
export const waTrainingData = pgTable('wa_training_data', {
  id: serial('id').primaryKey(),
  chatbotId: integer('chatbot_id').references(() => waChatbots.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'text', 'pdf', 'website', 'qa'
  title: text('title'),
  content: text('content'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Contacts & Groups ──────────────────────────────────────────────────────
export const waContactGroups = pgTable('wa_contact_groups', {
  id: serial('id').primaryKey(),
  clinicId: integer('clinic_id'),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const waContacts = pgTable('wa_contacts', {
  id: serial('id').primaryKey(),
  clinicId: integer('clinic_id'),
  phone: varchar('phone', { length: 20 }).notNull(),
  name: varchar('name', { length: 200 }),
  email: varchar('email', { length: 200 }),
  tags: jsonb('tags').default([]),
  metadata: jsonb('metadata').default({}),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  contactPhoneClinicUnique: unique('wa_contact_phone_clinic_unique').on(table.phone, table.clinicId),
}));

export const waContactGroupMembers = pgTable('wa_contact_group_members', {
  id: serial('id').primaryKey(),
  contactId: integer('contact_id').references(() => waContacts.id, { onDelete: 'cascade' }),
  groupId: integer('group_id').references(() => waContactGroups.id, { onDelete: 'cascade' }),
});

// ─── Media Library ───────────────────────────────────────────────────────────
export const waMedia = pgTable('wa_media', {
  id: serial('id').primaryKey(),
  clinicId: integer('clinic_id'),
  name: text('name').notNull(),
  mediaId: text('media_id'), // Meta Media ID
  type: text('type').notNull(), // image, video, document, audio
  mimeType: text('mime_type'),
  url: text('url'), // Local/CDN URL
  size: integer('size'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
