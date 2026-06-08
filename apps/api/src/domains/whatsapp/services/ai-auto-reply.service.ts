import OpenAI from 'openai';
import type { WhatsAppRepository } from '../ports/whatsapp.repository.js';
import type { WhatsAppGateway } from '../ports/whatsapp-gateway.js';
import { searchTrainingData } from './training.service.js';
import { getWhatsAppGateway } from '../../../infrastructure/http/gateways/whatsapp.gateway.js';
import { createLogger } from '../../../shared/logger.js';

const logger = createLogger('ai-auto-reply-service');

export class AiAutoReplyService {
  private readonly socketGateway = getWhatsAppGateway();

  constructor(
    private readonly waRepo: WhatsAppRepository,
    private readonly gateway: WhatsAppGateway,
  ) {}

  async execute(
    channel: any,
    conversation: any,
    messageContent: string,
    senderPhone: string,
  ): Promise<void> {
    // 1. Skip if already assigned to a real agent
    if (conversation.status === 'assigned' && conversation.assignedTo) {
      logger.info(
        `[AI AutoReply] Skipping - conversation ${conversation.id} already assigned to agent ID ${conversation.assignedTo}`,
      );
      return;
    }

    // 2. Fetch AI settings for the channel
    const aiSetting = await this.waRepo.findAiSettings(channel.id);
    if (!aiSetting || !aiSetting.isActive || !aiSetting.apiKey) {
      logger.info(
        `[AI AutoReply] AI AutoReply not active or configured for channel ID ${channel.id}`,
      );
      return;
    }

    // 3. Evaluate trigger words on the first few messages
    const existingMessages = await this.waRepo.listMessages(conversation.id);
    const isFirstMessage = existingMessages.length <= 1;

    let triggerWords: string[] = [];
    if (Array.isArray(aiSetting.triggerWords)) {
      triggerWords = aiSetting.triggerWords;
    } else if (typeof aiSetting.triggerWords === 'string') {
      try {
        triggerWords = JSON.parse(aiSetting.triggerWords);
      } catch {
        triggerWords = [];
      }
    }

    if (triggerWords.length > 0 && isFirstMessage) {
      const msgLower = messageContent.toLowerCase().trim();
      const hasMatch = triggerWords.some((word: string) =>
        msgLower.includes(word.toLowerCase().trim()),
      );
      if (!hasMatch) {
        logger.info(
          `[AI AutoReply] Incoming message did not match trigger words. Skipping auto-reply.`,
        );
        return;
      }
    }

    // 4. Construct conversation history (last 10 messages)
    const conversationHistory = existingMessages
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-10)
      .map((msg: any) => ({
        role: (msg.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: msg.content,
      }));

    // 5. Search Knowledge Base (RAG)
    let trainingContext = '';
    try {
      const searchResults = await searchTrainingData(this.waRepo, channel.id, messageContent);
      if (searchResults.chunks.length > 0) {
        trainingContext += '\n\n--- CLINIC KNOWLEDGE BASE & SCIENTIFIC TRAINING DATA ---\n';
        trainingContext += searchResults.chunks.join('\n\n');
      }
      if (searchResults.qaPairs.length > 0) {
        trainingContext += '\n\n--- CLINIC FREQUENTLY ASKED QUESTIONS (FAQ) ---\n';
        for (const qa of searchResults.qaPairs) {
          trainingContext += `Q: ${qa.question}\nA: ${qa.answer}\n\n`;
        }
      }
    } catch (err: any) {
      logger.warn(`[AI AutoReply] Knowledge base retrieval failed: ${err.message}`);
    }

    // 6. Handle unanswered fallback calculations for escalation
    const unansweredCount = existingMessages.filter(
      (m: any) =>
        m.direction === 'outbound' &&
        m.fromType === 'bot' &&
        (m.content.includes("I don't have") ||
          m.content.includes("I'm not sure") ||
          m.content.includes('cannot find') ||
          m.content.includes('transfer you')),
    ).length;

    const escalationRules = aiSetting.escalationRules || {};
    const maxAttempts = escalationRules.maxAttempts || 3;

    // 7. System Prompt Configuration
    const clinicName = channel.name || 'our clinic';
    const basePrompt =
      aiSetting.systemPrompt ||
      `You are a professional, caring, and helpful clinical chatbot assistant for ${clinicName}. 
Your goal is to answer patient inquiries, share details about doctor availabilities, educational FAQs, and general clinic operations.
You MUST ONLY answer questions based on the provided clinic knowledge base and FAQ. If the answer is not in the knowledge base, be honest and initiate escalation.
Keep responses highly concise (under 200 words), clean, polite, and friendly. Do not prescribe medicines or provide complex medical diagnosis.`;

    const escalationInstruction = `\n\nESCALATION RULES:
- If you cannot confidently answer the patient's inquiry using the provided clinical knowledge base/FAQ, or if the question is about an emergency, a custom medical diagnosis, or a specific treatment plan not detailed in your context, you MUST start your response with "[ESCALATE_TO_AGENT]" and provide a polite, caring message informing them that you are transferring them to our medical support staff.
${unansweredCount >= maxAttempts - 1 ? `- The patient has had ${unansweredCount} unanswered questions. You MUST escalate now by starting your response with "[ESCALATE_TO_AGENT]".` : ''}
- When escalating, always assure the patient that our clinical team will get back to them immediately.`;

    const systemPrompt = `${basePrompt}${trainingContext}${escalationInstruction}`;

    // 8. Initialize OpenAI Client
    const aiClient = new OpenAI({
      apiKey: aiSetting.apiKey,
      baseURL: aiSetting.endpoint || 'https://api.openai.com/v1',
    });

    const modelName = aiSetting.model || 'gpt-4o-mini';
    const tempValue = parseFloat(aiSetting.temperature || '0.7');
    const maxTokens = parseInt(aiSetting.maxTokens || '500');

    try {
      logger.info(`[AI AutoReply] Sending chat completion request with model: ${modelName}`);
      const completion = await aiClient.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: messageContent },
        ],
        temperature: tempValue,
        max_tokens: maxTokens,
      });

      let aiResponse = completion.choices?.[0]?.message?.content || '';
      if (!aiResponse.trim()) {
        logger.warn('[AI AutoReply] Received empty response from AI completion');
        return;
      }

      let escalated = false;
      if (aiResponse.includes('[ESCALATE_TO_AGENT]')) {
        aiResponse = aiResponse.replace(/\[ESCALATE_TO_AGENT\]/g, '').trim();
        escalated = true;
      }

      // 9. Process Escalation Status Changes
      if (escalated) {
        // Change conversation status to pending so it flags the staff on dashboard
        await this.waRepo.saveConversation({
          id: conversation.id,
          status: 'pending',
          updatedAt: new Date(),
        });

        if (
          !aiResponse.toLowerCase().includes('transfer') &&
          !aiResponse.toLowerCase().includes('connect') &&
          !aiResponse.toLowerCase().includes('staff')
        ) {
          aiResponse += `\n\nI'm transferring you to our medical team. A support representative will be with you shortly.`;
        }
        logger.info(`[AI AutoReply] Escalated conversation ${conversation.id} to human queue`);
      }

      // 10. Send reply message to patient via Meta API
      const sendResult = await this.gateway.sendText(channel.id, senderPhone, aiResponse);
      const whatsappMessageId = sendResult?.messageId || null;

      // 11. Save the bot's response message in database
      const savedMessage = await this.waRepo.saveMessage({
        conversationId: conversation.id,
        whatsappMessageId,
        direction: 'outbound',
        content: aiResponse,
        type: 'text',
        fromType: 'bot',
        status: sendResult.success ? 'sent' : 'failed',
        timestamp: new Date(),
        errorMessage: sendResult.error || null,
      });

      // 12. Update last message state on conversation
      await this.waRepo.saveConversation({
        id: conversation.id,
        lastMessageAt: new Date(),
        lastMessageText: aiResponse.substring(0, 200),
        updatedAt: new Date(),
      });

      // 13. Emit real-time message via socket gateway
      if (this.socketGateway) {
        this.socketGateway.emitMessage(channel.id, conversation.id, savedMessage);
      }

      logger.info(`[AI AutoReply] Successfully sent auto-reply to patient ${senderPhone}`);
    } catch (err: any) {
      logger.error(`[AI AutoReply] Chat completion execution failed: ${err.message}`);

      // Fallback: update status to pending so clinical team notices there was a conversation error
      await this.waRepo.saveConversation({
        id: conversation.id,
        status: 'pending',
        updatedAt: new Date(),
      });
    }
  }
}

export async function autoReplyPipeline(params: {
  channelId: number;
  contactPhone: string;
  messageContent: string;
  db: any;
  repo: WhatsAppRepository;
  gateway: WhatsAppGateway;
}): Promise<{ handled: boolean; response?: string }> {
  const { channelId, contactPhone, messageContent, repo } = params;

  // 1. Fetch channel
  const channel = await repo.findChannelById(channelId);
  if (!channel) {
    logger.warn(`[autoReplyPipeline] Channel not found: ${channelId}`);
    return { handled: false };
  }

  // 2. Fetch AI settings for the channel
  const aiSetting = await repo.findAiSettings(channelId);
  if (!aiSetting || !aiSetting.isActive || !aiSetting.apiKey) {
    logger.info(
      `[autoReplyPipeline] AI settings not active or configured for channel ID ${channelId}`,
    );
    return { handled: false };
  }

  // 3. Find or create conversation
  let conversation = await repo.findConversationByPhone(channelId, contactPhone);
  if (!conversation) {
    conversation = await repo.saveConversation({
      clinicId: channel.clinicId,
      channelId,
      contactPhone,
      status: 'open',
      type: 'widget',
      lastMessageAt: new Date(),
      lastMessageText: messageContent.substring(0, 200),
    });
  }

  // 4. Skip if already assigned to a real agent
  if (conversation.status === 'assigned' && conversation.assignedTo) {
    logger.info(
      `[autoReplyPipeline] Skipping - conversation ${conversation.id} already assigned to agent ID ${conversation.assignedTo}`,
    );
    return { handled: false };
  }

  // 5. Evaluate trigger words on the first few messages
  const existingMessages = await repo.listMessages(conversation.id);
  const isFirstMessage = existingMessages.length <= 1;

  let triggerWords: string[] = [];
  if (Array.isArray(aiSetting.triggerWords)) {
    triggerWords = aiSetting.triggerWords;
  } else if (typeof aiSetting.triggerWords === 'string') {
    try {
      triggerWords = JSON.parse(aiSetting.triggerWords);
    } catch {
      triggerWords = [];
    }
  }

  if (triggerWords.length > 0 && isFirstMessage) {
    const msgLower = messageContent.toLowerCase().trim();
    const hasMatch = triggerWords.some((word: string) =>
      msgLower.includes(word.toLowerCase().trim()),
    );
    if (!hasMatch) {
      logger.info(
        `[autoReplyPipeline] Incoming message did not match trigger words. Skipping auto-reply.`,
      );
      return { handled: false };
    }
  }

  // 6. Construct conversation history (last 10 messages)
  const conversationHistory = existingMessages
    .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-10)
    .map((msg: any) => ({
      role: (msg.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: msg.content,
    }));

  // 7. Search Knowledge Base (RAG)
  let trainingContext = '';
  try {
    const searchResults = await searchTrainingData(repo, channelId, messageContent);
    if (searchResults.chunks.length > 0) {
      trainingContext += '\n\n--- CLINIC KNOWLEDGE BASE & SCIENTIFIC TRAINING DATA ---\n';
      trainingContext += searchResults.chunks.join('\n\n');
    }
    if (searchResults.qaPairs.length > 0) {
      trainingContext += '\n\n--- CLINIC FREQUENTLY ASKED QUESTIONS (FAQ) ---\n';
      for (const qa of searchResults.qaPairs) {
        trainingContext += `Q: ${qa.question}\nA: ${qa.answer}\n\n`;
      }
    }
  } catch (err: any) {
    logger.warn(`[autoReplyPipeline] Knowledge base retrieval failed: ${err.message}`);
  }

  // 8. Handle unanswered fallback calculations for escalation
  const unansweredCount = existingMessages.filter(
    (m: any) =>
      m.direction === 'outbound' &&
      m.fromType === 'bot' &&
      (m.content.includes("I don't have") ||
        m.content.includes("I'm not sure") ||
        m.content.includes('cannot find') ||
        m.content.includes('transfer you')),
  ).length;

  const escalationRules = aiSetting.escalationRules || {};
  const maxAttempts = escalationRules.maxAttempts || 3;

  // 9. System Prompt Configuration
  const clinicName = channel.name || 'our clinic';
  const basePrompt =
    aiSetting.systemPrompt ||
    `You are a professional, caring, and helpful clinical chatbot assistant for ${clinicName}. 
Your goal is to answer patient inquiries, share details about doctor availabilities, educational FAQs, and general clinic operations.
You MUST ONLY answer questions based on the provided clinic knowledge base and FAQ. If the answer is not in the knowledge base, be honest and initiate escalation.
Keep responses highly concise (under 200 words), clean, polite, and friendly. Do not prescribe medicines or provide complex medical diagnosis.`;

  const escalationInstruction = `\n\nESCALATION RULES:
- If you cannot confidently answer the patient's inquiry using the provided clinical knowledge base/FAQ, or if the question is about an emergency, a custom medical diagnosis, or a specific treatment plan not detailed in your context, you MUST start your response with "[ESCALATE_TO_AGENT]" and provide a polite, caring message informing them that you are transferring them to our medical support staff.
${unansweredCount >= maxAttempts - 1 ? `- The patient has had ${unansweredCount} unanswered questions. You MUST escalate now by starting your response with "[ESCALATE_TO_AGENT]".` : ''}
- When escalating, always assure the patient that our clinical team will get back to them immediately.`;

  const systemPrompt = `${basePrompt}${trainingContext}${escalationInstruction}`;

  // 10. Initialize OpenAI Client
  const aiClient = new OpenAI({
    apiKey: aiSetting.apiKey,
    baseURL: aiSetting.endpoint || 'https://api.openai.com/v1',
  });

  const modelName = aiSetting.model || 'gpt-4o-mini';
  const tempValue = parseFloat(aiSetting.temperature || '0.7');
  const maxTokens = parseInt(aiSetting.maxTokens || '500');

  try {
    logger.info(`[autoReplyPipeline] Sending chat completion request with model: ${modelName}`);
    const completion = await aiClient.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: messageContent },
      ],
      temperature: tempValue,
      max_tokens: maxTokens,
    });

    let aiResponse = completion.choices?.[0]?.message?.content || '';
    if (!aiResponse.trim()) {
      logger.warn('[autoReplyPipeline] Received empty response from AI completion');
      return { handled: false };
    }

    let escalated = false;
    if (aiResponse.includes('[ESCALATE_TO_AGENT]')) {
      aiResponse = aiResponse.replace(/\[ESCALATE_TO_AGENT\]/g, '').trim();
      escalated = true;
    }

    if (escalated) {
      await repo.saveConversation({
        id: conversation.id,
        status: 'pending',
        updatedAt: new Date(),
      });

      if (
        !aiResponse.toLowerCase().includes('transfer') &&
        !aiResponse.toLowerCase().includes('connect') &&
        !aiResponse.toLowerCase().includes('staff')
      ) {
        aiResponse += `\n\nI'm transferring you to our medical team. A support representative will be with you shortly.`;
      }
      logger.info(`[autoReplyPipeline] Escalated conversation ${conversation.id} to human queue`);
    }

    return { handled: true, response: aiResponse };
  } catch (err: any) {
    logger.error(`[autoReplyPipeline] Chat completion execution failed: ${err.message}`);
    return { handled: false };
  }
}
