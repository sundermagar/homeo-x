import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { TenantRegistry, createDbClient } from '@mmc/database';
import { WhatsAppRepositoryPG } from '../../repositories/whatsapp.repository.pg.js';
import { WhatsAppCloudGateway } from '../../communication/whatsapp-cloud-gateway.js';
import { WhatsAppGateway } from '../../../domains/whatsapp/ports/whatsapp-gateway.js';
import { HandleWebhookUseCase } from '../../../domains/whatsapp/use-cases/handle-webhook.use-case.js';
import { BroadcastCampaignUseCase } from '../../../domains/whatsapp/use-cases/broadcast-campaign.use-case.js';
import { SyncTemplatesUseCase } from '../../../domains/whatsapp/use-cases/sync-templates.use-case.js';
import { CommunicationRepositoryPG } from '../../repositories/communication.repository.pg.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware } from '../middleware/auth.js';
import { sendSuccess } from '../../../shared/response-formatter.js';
import { BadRequestError } from '../../../shared/errors.js';
import { createLogger } from '../../../shared/logger.js';
import multer from 'multer';

const logger = createLogger('whatsapp-router');
const upload = multer({ storage: multer.memoryStorage() });

export const whatsappRouter: Router = Router();

const getRepo = (req: any) => new WhatsAppRepositoryPG(req.tenantDb);
const getGateway = (req: any) => new WhatsAppCloudGateway(getRepo(req));

// ─── Webhook (Public) ────────────────────────────────────────────────────────

// GET /api/whatsapp/webhook - Webhook verification
whatsappRouter.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || process.env.VERIFY_TOKEN || 'kreed_verify_token';

  if (mode === 'subscribe' && token === expectedToken) {
    logger.info('Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    logger.warn('Webhook verification failed');
    res.sendStatus(403);
  }
});

// POST /api/whatsapp/webhook - Incoming events
whatsappRouter.post('/webhook', asyncHandler(async (req, res) => {
  logger.info(`Received WhatsApp webhook event: ${JSON.stringify(req.body)}`);

  let targetDb = req.tenantDb; // Fallback to resolved schema (typically demo)

  try {
    const changes = req.body?.entry?.[0]?.changes?.[0];
    const value = changes?.value;
    const field = changes?.field;

    if (field === 'messages') {
      const phoneNumberId = value?.metadata?.phone_number_id;
      const statusId = value?.statuses?.[0]?.id;
      const messageId = value?.messages?.[0]?.id;

      let matchedSchemaName: string | null = null;
      
      // Load all tenant configurations
      const tenants = TenantRegistry.getAll();

      // 1. Match by Phone Number ID (for incoming messages)
      if (phoneNumberId) {
        logger.info(`Webhook lookup: Scanning schemas for wa_channels matching phone_number_id: ${phoneNumberId}`);
        for (const tenant of tenants) {
          try {
            const client = createDbClient(process.env.DATABASE_URL!, tenant.schemaName);
            const [channel] = await client.execute(sql`
              SELECT id FROM wa_channels WHERE phone_number_id = ${phoneNumberId} LIMIT 1
            `);
            if (channel) {
              matchedSchemaName = tenant.schemaName;
              logger.info(`Webhook lookup: Match found! Routing to schema: ${tenant.schemaName}`);
              break;
            }
          } catch (e: any) {
            // Ignore missing tables or connection issues on specific schemas
          }
        }
      }

      // 2. Match by message ID (for status updates like delivered/read)
      if (!matchedSchemaName && (statusId || messageId)) {
        const queryId = statusId || messageId;
        logger.info(`Webhook lookup: Scanning schemas for wa_messages matching message id: ${queryId}`);
        for (const tenant of tenants) {
          try {
            const client = createDbClient(process.env.DATABASE_URL!, tenant.schemaName);
            const [msg] = await client.execute(sql`
              SELECT id FROM wa_messages WHERE whatsapp_message_id = ${queryId} LIMIT 1
            `);
            if (msg) {
              matchedSchemaName = tenant.schemaName;
              logger.info(`Webhook lookup: Match found! Routing status to schema: ${tenant.schemaName}`);
              break;
            }
          } catch (e: any) {
            // Ignore error
          }
        }
      }

      if (matchedSchemaName) {
        targetDb = createDbClient(process.env.DATABASE_URL!, matchedSchemaName);
      } else {
        logger.warn(`Webhook lookup: No matching channel or message found in any tenant schema for event. Falling back to default.`);
      }
    }
  } catch (err: any) {
    logger.error(`Error resolving tenant schema for incoming WhatsApp webhook: ${err.message}`);
  }

  const repo = new WhatsAppRepositoryPG(targetDb);
  const gateway = new WhatsAppCloudGateway(repo);
  const useCase = new HandleWebhookUseCase(repo, gateway);
  await useCase.execute(req.body);
  res.sendStatus(200);
}));

// ─── Channels (Private) ──────────────────────────────────────────────────────

whatsappRouter.get('/channels', authMiddleware, asyncHandler(async (req, res) => {
  const clinicId = (req as any).user?.contextId;
  const channels = await getRepo(req).listChannels(clinicId);
  sendSuccess(res, channels);
}));

whatsappRouter.post('/channels', authMiddleware, asyncHandler(async (req, res) => {
  const clinicId = (req as any).user?.contextId;
  const channel = await getRepo(req).saveChannel({ 
    ...req.body, 
    clinicId,
    createdBy: (req as any).user?.id
  });
  sendSuccess(res, channel, 'Channel created successfully', 201);
}));

// ─── Templates (Private) ─────────────────────────────────────────────────────

whatsappRouter.get('/templates', authMiddleware, asyncHandler(async (req, res) => {
  const { channelId } = req.query;
  if (!channelId) throw new BadRequestError('channelId is required');
  const templates = await getRepo(req).listTemplates(Number(channelId));
  sendSuccess(res, templates);
}));

whatsappRouter.post('/templates', authMiddleware, asyncHandler(async (req, res) => {
  const { channelId, name, category, language, header, body, footer, buttons } = req.body;
  if (!channelId) throw new BadRequestError('channelId is required');
  if (!name) throw new BadRequestError('name is required');
  if (!body) throw new BadRequestError('body is required');
  if (!category) throw new BadRequestError('category is required');

  const repo = getRepo(req);
  const template = await repo.saveTemplate({
    channelId: Number(channelId),
    name,
    category,
    language: language || 'en_US',
    header: header || '',
    body,
    footer: footer || '',
    buttons: buttons || [],
    status: 'approved',
    whatsappTemplateId: `local_${Date.now()}`
  });

  sendSuccess(res, template, 'Template created successfully', 201);
}));

whatsappRouter.post('/templates/sync', authMiddleware, asyncHandler(async (req, res) => {
  const { channelId } = req.body;
  if (!channelId) throw new BadRequestError('channelId is required');
  
  const useCase = new SyncTemplatesUseCase(getGateway(req), getRepo(req));
  const result = await useCase.execute(Number(channelId));
  
  sendSuccess(res, result, `Synced ${result.total} templates: ${result.created} new, ${result.updated} updated`);
}));

// ─── Campaigns (Private) ─────────────────────────────────────────────────────

whatsappRouter.get('/campaigns', authMiddleware, asyncHandler(async (req, res) => {
  const clinicId = (req as any).user?.contextId;
  const { page, limit, search } = req.query;
  const campaigns = await getRepo(req).listCampaigns(clinicId, {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    search: search as string
  });
  sendSuccess(res, campaigns);
}));

whatsappRouter.post('/campaigns', authMiddleware, asyncHandler(async (req, res) => {
  const clinicId = (req as any).user?.contextId;
  const { recipients, ...campaignData } = req.body;
  
  const repo = getRepo(req);
  const campaign = await repo.saveCampaign({
    ...campaignData,
    clinicId,
    status: 'draft',
    createdBy: (req as any).user?.id,
    recipientCount: recipients?.length || 0
  });
  
  if (recipients && recipients.length > 0) {
    for (const r of recipients) {
      await repo.saveRecipient({
        campaignId: campaign.id,
        phone: r.phone,
        name: r.name,
        templateParams: r.params || [],
        status: 'pending'
      });
    }
  }
  
  sendSuccess(res, campaign, 'Campaign created successfully', 201);
}));

whatsappRouter.post('/campaigns/:id/broadcast', authMiddleware, asyncHandler(async (req, res) => {
  const useCase = new BroadcastCampaignUseCase(getRepo(req), getGateway(req));
  const result = await useCase.execute(Number(req.params.id));
  
  if (result.success) {
    sendSuccess(res, result.data, 'Broadcast started');
  } else {
    throw new BadRequestError(result.error || 'Broadcast failed');
  }
}));

whatsappRouter.post('/media/upload', authMiddleware, upload.single('file'), asyncHandler(async (req, res) => {
  const { channelId, title } = req.body;
  if (!channelId) throw new BadRequestError('channelId is required');
  if (!req.file) throw new BadRequestError('file is required');
  
  const gateway = getGateway(req);
  const repo = getRepo(req);

  // 1. Upload to Meta
  const mediaId = await gateway.uploadMedia(
    Number(channelId), 
    req.file.buffer, 
    req.file.originalname, 
    req.file.mimetype
  );

  // 2. Resolve clinicId from the channel
  const channel = await repo.findChannelById(Number(channelId));
  if (!channel) throw new BadRequestError('Invalid channelId');

  // 3. Save to wa_media table
  let type = 'document';
  if (req.file.mimetype.startsWith('image/')) type = 'image';
  else if (req.file.mimetype.startsWith('video/')) type = 'video';
  else if (req.file.mimetype.startsWith('audio/')) type = 'audio';

  const mediaRecord = await repo.saveMedia({
    clinicId: channel.clinicId,
    name: title || req.file.originalname,
    mediaId,
    type,
    mimeType: req.file.mimetype,
    url: '', // Avoid NOT NULL constraint violation in database
    size: req.file.size
  });
  
  sendSuccess(res, mediaRecord, 'Media uploaded securely');
}));

// ─── Conversations (Private) ─────────────────────────────────────────────────

whatsappRouter.get('/conversations', authMiddleware, asyncHandler(async (req, res) => {
  const { channelId } = req.query;
  if (!channelId) throw new BadRequestError('channelId is required');
  const conversations = await getRepo(req).listConversations(Number(channelId));
  sendSuccess(res, conversations);
}));

whatsappRouter.post('/conversations', authMiddleware, asyncHandler(async (req, res) => {
  const clinicId = (req as any).user?.contextId;
  const { channelId, contactPhone, contactName } = req.body;
  if (!channelId) throw new BadRequestError('channelId is required');
  if (!contactPhone) throw new BadRequestError('contactPhone is required');

  const repo = getRepo(req);
  const cleanPhone = contactPhone.replace(/\D/g, '');

  let conversation = await repo.findConversationByPhone(Number(channelId), cleanPhone);
  if (!conversation) {
    const channel = await repo.findChannelById(Number(channelId));
    conversation = await repo.saveConversation({
      clinicId: channel?.clinicId || clinicId,
      channelId: Number(channelId),
      contactPhone: cleanPhone,
      contactName: contactName || null,
      status: 'open',
      lastMessageAt: new Date(),
      lastMessageText: 'Conversation started',
    });
  }

  sendSuccess(res, conversation, 'Conversation resolved successfully');
}));

whatsappRouter.get('/conversations/:id/messages', authMiddleware, asyncHandler(async (req, res) => {
  const repo = getRepo(req);
  const convId = Number(req.params.id);
  
  // Mark conversation as read: reset unreadCount to 0 in database
  const conversation = await repo.findConversationById(convId);
  if (conversation && (conversation.unreadCount || 0) > 0) {
    await repo.saveConversation({
      id: convId,
      unreadCount: 0
    });
  }

  const messages = await repo.listMessages(convId);
  sendSuccess(res, messages);
}));

whatsappRouter.post('/conversations/:id/read', authMiddleware, asyncHandler(async (req, res) => {
  const repo = getRepo(req);
  const convId = Number(req.params.id);
  const conversation = await repo.findConversationById(convId);
  if (conversation) {
    await repo.saveConversation({
      id: convId,
      unreadCount: 0
    });
  }
  sendSuccess(res, null, 'Conversation marked as read');
}));

whatsappRouter.post('/conversations/:id/messages', authMiddleware, asyncHandler(async (req, res) => {
  const { content, mediaId, mediaType, fileName } = req.body;
  if (!content && !mediaId) throw new BadRequestError('content or mediaId is required');
  
  const repo = getRepo(req);
  const conversation = await repo.findConversationById(Number(req.params.id));
  if (!conversation) throw new BadRequestError('Conversation not found');
  
  const gateway: WhatsAppGateway = getGateway(req);
  let result;
  
  if (mediaId) {
    result = await gateway.sendMedia(conversation.channelId, conversation.contactPhone, mediaId, mediaType || 'document', fileName, content);
  } else {
    result = await gateway.sendText(conversation.channelId, conversation.contactPhone, content);
  }
  
  if (result.success) {
    const displayContent = content 
      ? (mediaId ? `${content} (Attachment: ${fileName || mediaType || 'file'})` : content)
      : `Sent ${mediaType || 'file'}: ${fileName || ''}`;

    const message = await repo.saveMessage({
      conversationId: conversation.id,
      whatsappMessageId: result.messageId,
      direction: 'outbound',
      content: displayContent,
      type: mediaId ? 'media' : 'text',
      status: 'sent',
      timestamp: new Date()
    });
    
    await repo.saveConversation({
      id: conversation.id,
      lastMessageAt: new Date(),
      lastMessageText: displayContent.substring(0, 200)
    });
    
    sendSuccess(res, message, 'Message sent');
  } else {
    throw new BadRequestError(result.error || 'Failed to send message');
  }
}));

whatsappRouter.post('/conversations/:id/upload', authMiddleware, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new BadRequestError('file is required');
  
  const repo = getRepo(req);
  const conversation = await repo.findConversationById(Number(req.params.id));
  if (!conversation) throw new BadRequestError('Conversation not found');
  
  const gateway = getGateway(req);

  // 1. Upload to Meta
  const mediaId = await gateway.uploadMedia(
    conversation.channelId, 
    req.file.buffer, 
    req.file.originalname, 
    req.file.mimetype
  );

  // 2. Resolve type
  let type: 'document' | 'image' | 'video' | 'audio' = 'document';
  if (req.file.mimetype.startsWith('image/')) type = 'image';
  else if (req.file.mimetype.startsWith('video/')) type = 'video';
  else if (req.file.mimetype.startsWith('audio/')) type = 'audio';

  // 3. Save to wa_media table
  const mediaRecord = await repo.saveMedia({
    clinicId: conversation.clinicId,
    name: req.file.originalname,
    mediaId,
    type,
    mimeType: req.file.mimetype,
    url: '', // Avoid NOT NULL constraint violation in database
    size: req.file.size
  });
  
  sendSuccess(res, {
    mediaId,
    type,
    fileName: req.file.originalname,
    mediaRecord
  }, 'Media uploaded successfully');
}));

// ─── CRM (Private) ───────────────────────────────────────────────────────────

whatsappRouter.get('/contacts', authMiddleware, asyncHandler(async (req, res) => {
  const clinicId = (req as any).user?.contextId;
  const { page, limit, search } = req.query;
  const contacts = await getRepo(req).listContacts(clinicId, {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    search: search as string
  });
  sendSuccess(res, contacts);
}));

whatsappRouter.post('/contacts', authMiddleware, asyncHandler(async (req, res) => {
  const clinicId = (req as any).user?.contextId;
  const contact = await getRepo(req).saveContact({ ...req.body, clinicId });
  sendSuccess(res, contact, 'Contact saved successfully');
}));

whatsappRouter.get('/groups', authMiddleware, asyncHandler(async (req, res) => {
  const clinicId = (req as any).user?.contextId;
  const groups = await getRepo(req).listGroups(clinicId);
  sendSuccess(res, groups);
}));

whatsappRouter.post('/groups', authMiddleware, asyncHandler(async (req, res) => {
  const clinicId = (req as any).user?.contextId;
  const group = await getRepo(req).saveGroup({ ...req.body, clinicId });
  sendSuccess(res, group, 'Group created successfully');
}));

// ─── Media Library (Private) ─────────────────────────────────────────────────

whatsappRouter.get('/media', authMiddleware, asyncHandler(async (req, res) => {
  const clinicId = (req as any).user?.contextId;
  const { page, limit, search } = req.query;
  const media = await getRepo(req).listMedia(clinicId, {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    search: search as string
  });
  sendSuccess(res, media);
}));

whatsappRouter.post('/media', authMiddleware, asyncHandler(async (req, res) => {
  const clinicId = (req as any).user?.contextId;
  const media = await getRepo(req).saveMedia({ ...req.body, clinicId });
  sendSuccess(res, media, 'Media asset saved');
}));

// ─── AI Chatbots (Private) ───────────────────────────────────────────────────

whatsappRouter.get('/chatbots', authMiddleware, asyncHandler(async (req, res) => {
  const clinicId = (req as any).user?.contextId;
  const { page, limit } = req.query;
  const chatbots = await getRepo(req).listChatbots(clinicId, {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined
  });
  sendSuccess(res, chatbots);
}));

whatsappRouter.post('/chatbots', authMiddleware, asyncHandler(async (req, res) => {
  const clinicId = (req as any).user?.contextId;
  const chatbot = await getRepo(req).saveChatbot({ ...req.body, clinicId });
  sendSuccess(res, chatbot, 'Chatbot created successfully');
}));

whatsappRouter.get('/chatbots/:id/training', authMiddleware, asyncHandler(async (req, res) => {
  const trainingData = await getRepo(req).listTrainingData(Number(req.params.id));
  sendSuccess(res, trainingData);
}));

whatsappRouter.post('/chatbots/:id/training', authMiddleware, asyncHandler(async (req, res) => {
  const data = await getRepo(req).saveTrainingData({ ...req.body, chatbotId: Number(req.params.id) });
  sendSuccess(res, data, 'Training data added');
}));

// ─── Automations (Private) ───────────────────────────────────────────────────

whatsappRouter.get('/automations', authMiddleware, asyncHandler(async (req, res) => {
  const clinicId = (req as any).user?.contextId;
  const { page, limit } = req.query;
  const automations = await getRepo(req).listAutomations(clinicId, {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined
  });
  sendSuccess(res, automations);
}));

whatsappRouter.post('/automations', authMiddleware, asyncHandler(async (req, res) => {
  const clinicId = (req as any).user?.contextId;
  const automation = await getRepo(req).saveAutomation({ ...req.body, clinicId });
  sendSuccess(res, automation, 'Automation saved successfully');
}));

// ─── Analytics (Private) ─────────────────────────────────────────────────────

whatsappRouter.get('/analytics', authMiddleware, asyncHandler(async (req, res) => {
  const clinicId = (req as any).user?.contextId;
  const days = req.query.days ? Number(req.query.days) : 7;
  const analytics = await getRepo(req).getAnalytics(clinicId, days);
  sendSuccess(res, analytics);
}));

// ─── Unified Send (Private) ─────────────────────────────────────────────────
// These endpoints allow ANY part of the app to send WhatsApp messages
// through the WABA Cloud API. They auto-resolve the default channel.

whatsappRouter.post('/send-text', authMiddleware, asyncHandler(async (req, res) => {
  const clinicId = (req as any).user?.contextId;
  const { phone, message, channelId: explicitChannelId } = req.body;

  if (!phone?.trim()) throw new BadRequestError('phone is required');
  if (!message?.trim()) throw new BadRequestError('message is required');

  const repo = getRepo(req);
  const gateway: WhatsAppGateway = getGateway(req);

  // Resolve channel: use explicit channelId, or find default active channel for clinic
  let channelId: number | null = explicitChannelId ? Number(explicitChannelId) : null;
  if (!channelId) {
    const defaultChannel = await repo.findDefaultChannel(clinicId);
    if (!defaultChannel) {
      if (!process.env.WHATSAPP_TOKEN) {
        throw new BadRequestError('No active WhatsApp channel configured. Please add a WABA channel first or set WHATSAPP_TOKEN in .env.');
      }
    } else {
      channelId = defaultChannel.id;
    }
  }

  const cleanPhone = phone.replace(/\D/g, '');
  const result = await gateway.sendText(channelId, cleanPhone, message);

  if (result.success) {
    // Find or create conversation for tracking
    let conversation = await repo.findConversationByPhone(channelId, cleanPhone);
    if (!conversation) {
      const channel = channelId ? await repo.findChannelById(channelId) : null;
      conversation = await repo.saveConversation({
        clinicId: channel?.clinicId || clinicId,
        channelId: channelId,
        contactPhone: cleanPhone,
        status: 'open',
        lastMessageAt: new Date(),
        lastMessageText: message.substring(0, 200),
      });
    } else {
      await repo.saveConversation({
        id: conversation.id,
        lastMessageAt: new Date(),
        lastMessageText: message.substring(0, 200),
      });
    }

    // Save outbound message
    await repo.saveMessage({
      conversationId: conversation.id,
      whatsappMessageId: result.messageId,
      direction: 'outbound',
      content: message,
      type: 'text',
      status: 'sent',
      timestamp: new Date(),
    });

    // Also log to legacy whatsapp_logs for backward compatibility
    try {
      const commRepo = new CommunicationRepositoryPG(req.tenantDb);
      await commRepo.logWhatsApp({
        phone: cleanPhone,
        message,
        status: 'sent',
        deepLink: '', // Required by legacy logWhatsApp interface
      });
    } catch (err: any) {
      logger.warn(`Legacy WhatsApp log failed (non-critical): ${err.message}`);
    }

    sendSuccess(res, {
      success: true,
      messageId: result.messageId,
      conversationId: conversation.id,
      automated: true,
    }, 'WhatsApp message sent via Cloud API');
  } else {
    throw new BadRequestError(result.error || 'Failed to send WhatsApp message');
  }
}));

whatsappRouter.post('/send-template', authMiddleware, asyncHandler(async (req, res) => {
  const clinicId = (req as any).user?.contextId;
  const { phone, templateName, language, components, channelId: explicitChannelId } = req.body;

  if (!phone?.trim()) throw new BadRequestError('phone is required');
  if (!templateName?.trim()) throw new BadRequestError('templateName is required');

  const repo = getRepo(req);
  const gateway: WhatsAppGateway = getGateway(req);

  let channelId: number | null = explicitChannelId ? Number(explicitChannelId) : null;
  if (!channelId) {
    const defaultChannel = await repo.findDefaultChannel(clinicId);
    if (!defaultChannel) {
      if (!process.env.WHATSAPP_TOKEN) {
        throw new BadRequestError('No active WhatsApp channel configured. Please add a WABA channel first or set WHATSAPP_TOKEN in .env.');
      }
    } else {
      channelId = defaultChannel.id;
    }
  }

  const cleanPhone = phone.replace(/\D/g, '');
  const result = await gateway.sendTemplate(
    channelId,
    cleanPhone,
    templateName,
    language || 'en_US',
    components || []
  );

  if (result.success) {
    // Track in conversations
    let conversation = await repo.findConversationByPhone(channelId, cleanPhone);
    if (!conversation) {
      const channel = channelId ? await repo.findChannelById(channelId) : null;
      conversation = await repo.saveConversation({
        clinicId: channel?.clinicId || clinicId,
        channelId: channelId,
        contactPhone: cleanPhone,
        status: 'open',
        lastMessageAt: new Date(),
        lastMessageText: `Template: ${templateName}`,
      });
    }

    await repo.saveMessage({
      conversationId: conversation.id,
      whatsappMessageId: result.messageId,
      direction: 'outbound',
      content: `Template: ${templateName}`,
      type: 'template',
      status: 'sent',
      timestamp: new Date(),
    });

    // Also log to legacy whatsapp_logs for backward compatibility
    try {
      const commRepo = new CommunicationRepositoryPG(req.tenantDb);
      await commRepo.logWhatsApp({
        phone: cleanPhone,
        message: `Template: ${templateName}`,
        status: 'sent',
        deepLink: '', // Required by legacy logWhatsApp interface
      });
    } catch (err: any) {
      logger.warn(`Legacy WhatsApp log failed (non-critical): ${err.message}`);
    }

    sendSuccess(res, {
      success: true,
      messageId: result.messageId,
      conversationId: conversation.id,
    }, 'Template message sent');
  } else {
    throw new BadRequestError(result.error || 'Failed to send template message');
  }
}));

// GET /api/whatsapp/default-channel - Check if a WABA channel is configured
whatsappRouter.get('/default-channel', authMiddleware, asyncHandler(async (req, res) => {
  const clinicId = (req as any).user?.contextId;
  const repo = getRepo(req);
  const channel = await repo.findDefaultChannel(clinicId);
  sendSuccess(res, {
    configured: !!channel,
    channel: channel ? { id: channel.id, name: channel.name, phoneNumber: channel.phoneNumber } : null,
  });
}));
