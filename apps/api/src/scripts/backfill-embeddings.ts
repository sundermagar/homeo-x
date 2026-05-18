/**
 * Backfill embeddings for all ml_training_logs records that don't yet have
 * a row in `ml_training_embeddings`.
 * Run: pnpm exec tsx src/scripts/backfill-embeddings.ts (from apps/api)
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { createDbClient } from '@mmc/database';
import { mlTrainingLogs, mlTrainingEmbeddings } from '@mmc/database/schema';
import { sql } from 'drizzle-orm';
import { embeddingService } from '../domains/consultation/services/embedding.service.js';
import { createHash } from 'node:crypto';

async function main() {
  const DATABASE_URL = process.env['DATABASE_URL'];
  if (!DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const db = createDbClient(DATABASE_URL);

  // Logs that don't yet have a row in ml_training_embeddings
  const records = await db
    .select()
    .from(mlTrainingLogs)
    .where(sql`NOT EXISTS (
      SELECT 1 FROM ${mlTrainingEmbeddings}
      WHERE ${mlTrainingEmbeddings.mlTrainingLogId} = ${mlTrainingLogs.id}
    )`);

  console.log(`Found ${records.length} records without embeddings.`);

  for (const record of records) {
    console.log(`\n--- Processing visit ${record.visitId} (id=${record.id}) ---`);
    console.log(`  Mode: ${record.consultationMode}`);
    console.log(`  Has symptoms: ${!!record.extractedSymptoms}`);
    console.log(`  Has SOAP: ${!!record.soapNotes}`);
    console.log(`  Has rubrics: ${!!record.mappedRubrics}`);
    console.log(`  Has AI remedy: ${!!record.aiSuggestedRemedy}`);
    console.log(`  Has doctor remedy: ${!!record.doctorFinalRemedy}`);

    const fingerprint = embeddingService.createFingerprint(record);
    console.log(`  Fingerprint length: ${fingerprint.length}`);
    if (fingerprint) {
      console.log(`  Fingerprint preview: ${fingerprint.substring(0, 300)}...`);
    }

    if (!fingerprint) {
      console.log('  ⚠️ Skipping — empty fingerprint');
      continue;
    }

    console.log('  🔄 Calling Gemini for embedding...');
    const vector = await embeddingService.generateEmbedding(fingerprint);
    console.log(`  Vector dimensions: ${vector.length}`);

    if (!vector || vector.length === 0) {
      console.log('  ⚠️ Skipping — empty vector from Gemini');
      continue;
    }

    const hash = createHash('md5').update(fingerprint).digest('hex');

    await db.insert(mlTrainingEmbeddings).values({
      mlTrainingLogId: record.id,
      tenantId: record.tenantId,
      visitId: record.visitId,
      embedding: vector,
      embeddingModel: 'gemini-embedding-001',
      fingerprintHash: hash,
    });

    console.log(`  ✅ Embedding stored! (${vector.length} dimensions)`);
  }

  console.log('\n🎉 Done! All records processed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
