import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import type { WhatsAppRepository } from '../ports/whatsapp.repository.js';
import { createLogger } from '../../../shared/logger.js';

const logger = createLogger('training-service');

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

export function getAIClient(apiKey: string, endpoint?: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: endpoint || 'https://api.openai.com/v1',
  });
}

export async function getChannelAIClient(
  waRepo: WhatsAppRepository,
  channelId: number,
): Promise<OpenAI | null> {
  const setting = await waRepo.findAiSettings(channelId);
  if (!setting || !setting.apiKey || !setting.isActive) {
    return null;
  }
  return getAIClient(setting.apiKey, setting.endpoint || undefined);
}

export function splitTextIntoChunks(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join(' ');
    if (chunk.trim()) chunks.push(chunk.trim());
    i += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

export async function generateEmbedding(client: OpenAI, text: string): Promise<number[]> {
  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.substring(0, 8000),
  });
  if (!response?.data?.[0]?.embedding) {
    throw new Error('Invalid OpenAI embedding response');
  }
  return response.data[0].embedding;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const valA = a[i] ?? 0;
    const valB = b[i] ?? 0;
    dot += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function scrapeUrl(url: string): Promise<string> {
  logger.info(`Scraping content from URL: ${url}`);
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    signal: AbortSignal.timeout(15000),
    redirect: 'follow',
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);

  const html = await response.text();
  const $ = cheerio.load(html);

  const metaDescription = $('meta[name="description"]').attr('content') || '';
  const title = $('title').text().trim();
  const ogDescription = $('meta[property="og:description"]').attr('content') || '';

  $('script, style, nav, footer, header, aside, noscript, iframe, svg, link, meta').remove();

  let mainContent = '';
  const selectors = [
    'main',
    'article',
    '[role="main"]',
    '.content',
    '.main-content',
    '#content',
    '#main',
  ];
  for (const sel of selectors) {
    const text = $(sel).text().replace(/\s+/g, ' ').trim();
    if (text && text.length > 100) {
      mainContent = text;
      break;
    }
  }

  if (!mainContent || mainContent.length < 50) {
    mainContent = $('body').text().replace(/\s+/g, ' ').trim();
  }

  let finalContent = mainContent;
  if (finalContent.length < 50 && (metaDescription || ogDescription || title)) {
    finalContent = [title, metaDescription, ogDescription, finalContent].filter(Boolean).join('. ');
  }

  return finalContent;
}

export async function processTrainingSource(
  waRepo: WhatsAppRepository,
  sourceId: number,
): Promise<void> {
  const source = await waRepo.findTrainingSourceById(sourceId);
  if (!source) throw new Error('Source not found');

  logger.info(`Processing training source: ${source.name} (ID: ${sourceId})`);
  await waRepo.saveTrainingSource({ id: sourceId, status: 'processing', errorMessage: null });

  try {
    let content = source.content || '';

    if (source.type === 'url' && source.url) {
      content = await scrapeUrl(source.url);
    }

    if (!content.trim()) {
      await waRepo.saveTrainingSource({
        id: sourceId,
        status: 'error',
        errorMessage: 'No text content could be extracted',
      });
      return;
    }

    await waRepo.saveTrainingSource({ id: sourceId, content });

    const chunks = splitTextIntoChunks(content);
    const aiClient = await getChannelAIClient(waRepo, source.channelId);

    // Remove existing chunks
    await waRepo.deleteChunksBySource(sourceId);

    // Save new chunks with optional embeddings
    for (const chunkText of chunks) {
      let embedding: number[] | null = null;
      if (aiClient) {
        try {
          embedding = await generateEmbedding(aiClient, chunkText);
        } catch (err: any) {
          logger.warn(`Embedding generation failed for chunk: ${err.message}`);
        }
      }

      await waRepo.saveTrainingChunk({
        sourceId,
        channelId: source.channelId,
        content: chunkText,
        embedding: embedding,
        metadata: {
          sourceName: source.name,
          sourceType: source.type,
          sourceUrl: source.url,
        },
      });
    }

    await waRepo.saveTrainingSource({
      id: sourceId,
      status: 'completed',
      chunkCount: chunks.length,
    });
    logger.info(`Successfully completed processing training source: ${source.name}`);
  } catch (error: any) {
    logger.error(`Error processing training source ${sourceId}: ${error.message}`);
    await waRepo.saveTrainingSource({
      id: sourceId,
      status: 'error',
      errorMessage: error.message || 'Unknown error during scraping/embedding',
    });
  }
}

export async function generateQaEmbedding(
  waRepo: WhatsAppRepository,
  qaId: number,
  channelId: number,
): Promise<void> {
  const aiClient = await getChannelAIClient(waRepo, channelId);
  if (!aiClient) return;

  const qaPairs = await waRepo.listTrainingQaPairs(channelId);
  const qa = qaPairs.find((q) => q.id === qaId);
  if (!qa) return;

  try {
    const embedding = await generateEmbedding(aiClient, `${qa.question} ${qa.answer}`);
    await waRepo.saveTrainingQaPair({
      id: qaId,
      embedding: embedding,
    });
  } catch (err: any) {
    logger.warn(`Q&A embedding generation failed for QA ${qaId}: ${err.message}`);
  }
}

export async function searchTrainingData(
  waRepo: WhatsAppRepository,
  channelId: number,
  query: string,
  topK: number = 5,
): Promise<{ chunks: string[]; qaPairs: Array<{ question: string; answer: string }> }> {
  const aiClient = await getChannelAIClient(waRepo, channelId);

  let queryEmbedding: number[] | null = null;
  if (aiClient) {
    try {
      queryEmbedding = await generateEmbedding(aiClient, query);
    } catch (err: any) {
      logger.warn(
        `Query embedding generation failed: ${err.message}. Falling back to text matching.`,
      );
    }
  }

  // 1. Search text chunks
  const sources = await waRepo.listTrainingSources(channelId);
  const completedSourceIds = sources.filter((s) => s.status === 'completed').map((s) => s.id);

  let rankedChunks: Array<{ content: string; score: number }> = [];

  if (completedSourceIds.length > 0) {
    let allChunks: any[] = [];
    for (const sId of completedSourceIds) {
      const chunks = await waRepo.listTrainingChunks(sId);
      allChunks = allChunks.concat(chunks);
    }

    if (queryEmbedding && allChunks.some((c) => c.embedding)) {
      rankedChunks = allChunks
        .filter((c) => c.embedding)
        .map((c) => ({
          content: c.content,
          score: cosineSimilarity(queryEmbedding!, c.embedding as number[]),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    } else {
      const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);
      rankedChunks = allChunks
        .map((c) => {
          const lower = c.content.toLowerCase();
          const score = queryWords.filter((w) => lower.includes(w)).length;
          return { content: c.content, score };
        })
        .filter((c) => c.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    }
  }

  // 2. Search Q&A FAQ pairs
  const allQa = await waRepo.listTrainingQaPairs(channelId);
  const activeQa = allQa.filter((q) => q.isActive);

  let rankedQa: Array<{ question: string; answer: string; score: number }> = [];

  if (activeQa.length > 0) {
    if (queryEmbedding && activeQa.some((q) => q.embedding)) {
      rankedQa = activeQa
        .filter((q) => q.embedding)
        .map((q) => ({
          question: q.question,
          answer: q.answer,
          score: cosineSimilarity(queryEmbedding!, q.embedding as number[]),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
    } else {
      const queryLower = query.toLowerCase().trim();
      rankedQa = activeQa
        .map((q) => {
          const qLower = q.question.toLowerCase().trim();
          const score = qLower.includes(queryLower) || queryLower.includes(qLower) ? 1 : 0;
          return { question: q.question, answer: q.answer, score };
        })
        .filter((q) => q.score > 0)
        .slice(0, 3);
    }
  }

  return {
    chunks: rankedChunks.map((c) => c.content),
    qaPairs: rankedQa.map((q) => ({
      question: q.question,
      answer: q.answer,
    })),
  };
}
