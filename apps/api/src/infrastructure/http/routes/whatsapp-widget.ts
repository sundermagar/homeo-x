import { Router } from 'express';
import { sql, and, eq, desc } from 'drizzle-orm';
import { createDbClient } from '@mmc/database';
import rateLimit from 'express-rate-limit';
import { WhatsAppRepositoryPG } from '../../repositories/whatsapp.repository.pg.js';
import { WhatsAppCloudGateway } from '../../communication/whatsapp-cloud-gateway.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { sendSuccess } from '../../../shared/response-formatter.js';
import { BadRequestError } from '../../../shared/errors.js';
import { createLogger } from '../../../shared/logger.js';
import { autoReplyPipeline } from '../../../domains/whatsapp/services/ai-auto-reply.service.js';

const logger = createLogger('whatsapp-widget');
export const whatsappWidgetRouter: Router = Router();

// ─── Rate Limiting for Public Widget Endpoints ──────────────────────────────
const widgetGeneralLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please try again in 15 minutes.',
    code: 'RATE_LIMITED',
  },
});

const widgetChatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per 15 minutes (protects RAG API cost)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many chat requests. Please try again in 15 minutes.',
    code: 'RATE_LIMITED',
  },
});

// Apply general limiter to all widget routes
whatsappWidgetRouter.use(widgetGeneralLimiter);

// ─── DB Client Cache (prevents connection pool exhaustion) ─
const widgetDbCache = new Map<string, ReturnType<typeof createDbClient>>();
function getCachedClient(schemaName: string): ReturnType<typeof createDbClient> {
  let client = widgetDbCache.get(schemaName);
  if (!client) {
    client = createDbClient(process.env.DATABASE_URL!, schemaName);
    widgetDbCache.set(schemaName, client);
  }
  return client;
}
let cachedPublicDb: ReturnType<typeof createDbClient> | null = null;

// Helper to resolve the database client from channelId across all tenant schemas
const getDbForChannel = async (channelId: number) => {
  if (!channelId) throw new BadRequestError('channelId is required');

  if (!cachedPublicDb) {
    cachedPublicDb = createDbClient(process.env.DATABASE_URL!);
  }
  const schemaRows = await cachedPublicDb.execute(sql`
    SELECT table_schema 
    FROM information_schema.tables 
    WHERE table_name = 'wa_channels' 
      AND table_schema LIKE 'tenant_%'
  `);
  const activeSchemas = (schemaRows as any[]).map((r) => r.table_schema);

  for (const schemaName of activeSchemas) {
    try {
      const client = getCachedClient(schemaName);
      const [channel] = await client.execute(sql`
        SELECT id, clinic_id FROM wa_channels WHERE id = ${channelId} LIMIT 1
      `);
      if (channel) {
        return { client, schemaName, clinicId: channel.clinic_id as number };
      }
    } catch (e: any) {
      // Ignore
    }
  }

  throw new BadRequestError('Invalid channelId or channel not found');
};

// GET /api/widget/config/:channelId - Fetch branding and widget config
whatsappWidgetRouter.get(
  '/config/:channelId',
  asyncHandler(async (req, res) => {
    const channelId = Number(req.params.channelId);
    const { client } = await getDbForChannel(channelId);
    const [widget] = await client.execute(sql`
    SELECT widget_config FROM wa_widgets WHERE channel_id = ${channelId} AND widget_enabled = true LIMIT 1
  `);

    if (!widget) {
      sendSuccess(res, { enabled: false });
      return;
    }

    const config =
      typeof widget.widget_config === 'string'
        ? JSON.parse(widget.widget_config)
        : widget.widget_config;
    sendSuccess(res, { enabled: true, ...config });
  }),
);

// GET /api/widget/qa/:channelId - Fetch FAQs
whatsappWidgetRouter.get(
  '/qa/:channelId',
  asyncHandler(async (req, res) => {
    const channelId = Number(req.params.channelId);
    const { client } = await getDbForChannel(channelId);
    const qas = await client.execute(sql`
    SELECT question, answer, category FROM wa_training_qa_pairs WHERE channel_id = ${channelId} AND is_active = true
  `);

    sendSuccess(res, qas);
  }),
);

// POST /api/widget/contacts - Capture visitor lead
whatsappWidgetRouter.post(
  '/contacts',
  asyncHandler(async (req, res) => {
    const { channelId, phone, name, email } = req.body;
    if (!channelId || !phone) throw new BadRequestError('channelId and phone are required');

    const { client, clinicId } = await getDbForChannel(Number(channelId));
    const repo = new WhatsAppRepositoryPG(client);

    let contact = await repo.findContactByPhone(clinicId, phone);
    if (!contact) {
      contact = await repo.saveContact({ clinicId, phone, name, email, tags: ['Widget Lead'] });
    } else {
      contact = await repo.saveContact({
        ...contact,
        name: name || contact.name,
        email: email || contact.email,
      });
    }

    sendSuccess(res, contact);
  }),
);

// GET /api/widget/conversation/:conversationId - Get messages
whatsappWidgetRouter.get(
  '/conversation/:conversationId',
  asyncHandler(async (req, res) => {
    const channelId = Number(req.query.channelId);
    const conversationId = Number(req.params.conversationId);
    if (!channelId) throw new BadRequestError('channelId query param required');

    const { client } = await getDbForChannel(channelId);
    const repo = new WhatsAppRepositoryPG(client);

    const messages = await repo.listMessages(conversationId);
    sendSuccess(res, messages);
  }),
);

// POST /api/widget/chat - Chat handler and RAG integration (with stricter rate limit)
whatsappWidgetRouter.post(
  '/chat',
  widgetChatLimiter,
  asyncHandler(async (req, res) => {
    const { channelId, phone, content, conversationId } = req.body;
    if (!channelId || !phone || !content)
      throw new BadRequestError('channelId, phone, and content required');

    const { client, clinicId } = await getDbForChannel(Number(channelId));
    const repo = new WhatsAppRepositoryPG(client);

    let convId = conversationId ? Number(conversationId) : null;
    let conversation;

    if (convId) {
      conversation = await repo.findConversationById(convId);
    }

    if (!conversation) {
      conversation = await repo.findConversationByPhone(Number(channelId), phone);
      if (!conversation) {
        conversation = await repo.saveConversation({
          clinicId,
          channelId: Number(channelId),
          contactPhone: phone,
          status: 'open',
          type: 'widget',
          lastMessageAt: new Date(),
          lastMessageText: content.substring(0, 200),
        });
      }
    }

    convId = conversation.id;

    // Save user message (inbound from perspective of system)
    const userMessage = await repo.saveMessage({
      conversationId: convId,
      direction: 'inbound',
      content,
      type: 'text',
      status: 'received',
      fromType: 'user',
      timestamp: new Date(),
    });

    // Call AI auto reply service for RAG response
    let botReply = '';
    try {
      const aiResult = await autoReplyPipeline({
        channelId: Number(channelId),
        contactPhone: phone,
        messageContent: content,
        db: client as any,
        repo,
        gateway: new WhatsAppCloudGateway(repo), // Not strictly used for sending here since we respond directly
      });

      if (aiResult.handled && aiResult.response) {
        botReply = aiResult.response;
      }
    } catch (err: any) {
      logger.error('Widget chat RAG error: ' + err.message);
    }

    let botMessage = null;
    if (botReply) {
      // Save outbound bot message
      botMessage = await repo.saveMessage({
        conversationId: convId,
        direction: 'outbound',
        content: botReply,
        type: 'text',
        status: 'sent',
        fromType: 'bot',
        timestamp: new Date(),
      });

      await repo.saveConversation({
        id: convId,
        lastMessageAt: new Date(),
        lastMessageText: botReply.substring(0, 200),
      });
    }

    sendSuccess(res, {
      conversationId: convId,
      userMessage,
      botMessage,
    });
  }),
);
