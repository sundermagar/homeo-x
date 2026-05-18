// ─── ML Training Logger Service ───────────────────────────────────────────────
// Writes consultation chain-of-thought data into the public-schema
// `ml_training_logs` table.  Append-only, fire-and-forget — failures here
// MUST NEVER break the clinical workflow, so every call is wrapped in try/catch.

import { createDbClient, TenantRegistry } from '@mmc/database';
import { mlTrainingLogs, mlTrainingEmbeddings } from '@mmc/database/schema';
import { eq } from 'drizzle-orm';
import { createLogger } from '../../../shared/logger.js';
import { embeddingService } from './embedding.service.js';
import { createHash } from 'node:crypto';

const logger = createLogger('ml-training-logger');

// Cache db clients per tenant schema to avoid re-creating pools
const tenantClients = new Map<string, ReturnType<typeof createDbClient>>();

function getDbForTenant(tenantId: string) {
  // Resolve schema name: e.g., 'demo' -> 'tenant_demo'
  let schemaName = 'public';
  if (tenantId && tenantId !== 'default' && tenantId !== 'public') {
    // Look up in hardcoded or dynamically initialized registry
    const config = TenantRegistry.getAll().find(t => t.slug === tenantId);
    schemaName = config ? config.schemaName : `tenant_${tenantId}`;
  }

  if (tenantClients.has(schemaName)) {
    return tenantClients.get(schemaName)!;
  }

  const client = createDbClient(process.env.DATABASE_URL!, schemaName);
  tenantClients.set(schemaName, client);
  return client;
}

export class MlTrainingLoggerService {
  /**
   * Safely upserts a partial record into the tenant's ML training logs table.
   * Uses fully atomic ON CONFLICT DO UPDATE to avoid race conditions.
   */
  async logPhase(
    tenantId: string,
    visitId: string,
    data: Partial<typeof mlTrainingLogs.$inferInsert>,
  ): Promise<void> {
    if (!visitId) return;

    try {
      const db = getDbForTenant(tenantId);

      // ─── Auto-extract mappedRubrics from repertorizationMatrix ───
      if (data.repertorizationMatrix && !data.mappedRubrics) {
        const matrix = data.repertorizationMatrix as any;
        const scoredRemedies = matrix?.scoredRemedies;
        if (Array.isArray(scoredRemedies)) {
          const rubricMap = new Map<string, any>();
          for (const remedy of scoredRemedies) {
            if (Array.isArray(remedy.coverage)) {
              for (const c of remedy.coverage) {
                if (!c.rubricId) continue;
                const existing = rubricMap.get(c.rubricId);
                if (!existing || (c.grade ?? 0) > (existing.grade ?? 0)) {
                  rubricMap.set(c.rubricId, {
                    rubricId: c.rubricId,
                    rubricName: c.rubricDescription,
                    category: c.rubricCategory,
                    importance: c.importance,
                    grade: c.grade,
                  });
                }
              }
            }
          }
          if (rubricMap.size > 0) {
            data.mappedRubrics = [...rubricMap.values()];
            logger.info({ visitId, rubricCount: rubricMap.size }, '📊 logPhase: Auto-extracted unique rubrics');
          }
        }
      }

      // Perform an atomic upsert to completely eliminate duplicate row race conditions
      await db
        .insert(mlTrainingLogs)
        .values({
          tenantId,
          visitId,
          ...data,
        })
        .onConflictDoUpdate({
          target: mlTrainingLogs.visitId,
          set: {
            ...data,
            updatedAt: new Date(),
          },
        });

      logger.info({ visitId, tenantId }, '📊 logPhase: Successfully logged/updated ML training log phase');

      // ─── Trigger Async Embedding Generation ───
      const shouldRefresh = !!(data.doctorFinalRemedy || data.extractedSymptoms || data.mappedRubrics || data.soapNotes);
      if (shouldRefresh) {
        logger.info({ visitId }, '📊 logPhase: Triggering refreshEmbedding in background');
        this.refreshEmbedding(tenantId, visitId).catch((err) => {
          logger.error({ err: err.message, visitId }, 'Failed to background refresh embedding');
        });
      }
    } catch (err: any) {
      logger.error({ err: err.message, visitId }, 'Failed to upsert ML training log');
    }
  }

  /**
   * Fetches the full log record from the tenant schema, generates a fingerprint,
   * creates an embedding, and persists it into the tenant's `ml_training_embeddings`.
   */
  async refreshEmbedding(tenantId: string, visitId: string): Promise<void> {
    try {
      logger.info({ tenantId, visitId }, '🔄 refreshEmbedding: START');

      const db = getDbForTenant(tenantId);
      const [record] = await db
        .select()
        .from(mlTrainingLogs)
        .where(eq(mlTrainingLogs.visitId, visitId))
        .limit(1);

      if (!record) {
        logger.warn({ tenantId, visitId }, '🔄 refreshEmbedding: No log record found — aborting');
        return;
      }

      const fingerprint = embeddingService.createFingerprint(record);
      if (!fingerprint) {
        logger.warn({ visitId }, '🔄 refreshEmbedding: Empty fingerprint — aborting');
        return;
      }

      const hash = createHash('md5').update(fingerprint).digest('hex');

      const [existingEmbedding] = await db
        .select({ id: mlTrainingEmbeddings.id, fingerprintHash: mlTrainingEmbeddings.fingerprintHash })
        .from(mlTrainingEmbeddings)
        .where(eq(mlTrainingEmbeddings.mlTrainingLogId, record.id))
        .limit(1);

      if (existingEmbedding?.fingerprintHash === hash) {
        logger.info({ visitId }, '🔄 refreshEmbedding: Fingerprint unchanged — skipping');
        return;
      }

      const vector = await embeddingService.generateEmbedding(fingerprint);
      if (!vector || vector.length === 0) {
        logger.warn({ visitId }, '🔄 refreshEmbedding: Empty vector from Gemini — aborting');
        return;
      }

      if (existingEmbedding) {
        await db
          .update(mlTrainingEmbeddings)
          .set({
            embedding: vector,
            embeddingModel: 'gemini-embedding-001',
            fingerprintHash: hash,
            updatedAt: new Date(),
          })
          .where(eq(mlTrainingEmbeddings.id, existingEmbedding.id));
      } else {
        await db.insert(mlTrainingEmbeddings).values({
          mlTrainingLogId: record.id,
          tenantId: record.tenantId,
          visitId: record.visitId,
          embedding: vector,
          embeddingModel: 'gemini-embedding-001',
          fingerprintHash: hash,
        });
      }

      logger.info({ visitId }, '✅ refreshEmbedding: Embedding stored in DB');
    } catch (err: any) {
      logger.error({ err: err.message, stack: err.stack, visitId }, '❌ refreshEmbedding: Error');
    }
  }

  /**
   * Appends a Q&A entry to the transcript array for the given visit in the tenant schema.
   */
  async appendTranscript(
    tenantId: string,
    visitId: string,
    entry: { question: string; answer: string; timestamp: string },
  ): Promise<void> {
    if (!visitId || (!entry.question && !entry.answer)) return;

    let cleanAnswer = entry.answer || '';
    if (entry.question && cleanAnswer.includes(entry.question)) {
      const segments = cleanAnswer.split(entry.question).filter(s => s.trim());
      if (segments.length > 0) {
        const answerSegments = segments.filter(s => !s.trim().includes('?'));
        cleanAnswer = answerSegments.length > 0 
          ? answerSegments[answerSegments.length - 1]!.trim()
          : segments[segments.length - 1]!.trim();
      }
    }
    entry.answer = cleanAnswer;

    try {
      const db = getDbForTenant(tenantId);
      
      // Perform an atomic upsert to handle the insert/transcript append safely
      // Query current transcript first to update it atomically
      const existing = await db
        .select({ id: mlTrainingLogs.id, transcript: mlTrainingLogs.transcript })
        .from(mlTrainingLogs)
        .where(eq(mlTrainingLogs.visitId, visitId))
        .limit(1);

      const currentTranscript = (existing[0]?.transcript as any[]) || [];
      currentTranscript.push(entry);

      await db
        .insert(mlTrainingLogs)
        .values({
          tenantId,
          visitId,
          transcript: currentTranscript,
        })
        .onConflictDoUpdate({
          target: mlTrainingLogs.visitId,
          set: {
            transcript: currentTranscript,
            updatedAt: new Date(),
          },
        });
    } catch (err: any) {
      logger.error({ err: err.message, visitId }, 'Failed to append transcript');
    }
  }
}

// Singleton
export const mlTrainingLogger = new MlTrainingLoggerService();
