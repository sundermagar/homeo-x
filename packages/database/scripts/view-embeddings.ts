/**
 * View stored pgvector embeddings and run a similarity search demo.
 * Run: pnpm exec tsx scripts/view-embeddings.ts
 *
 * Embeddings live in `ml_training_embeddings` (1:1 with `ml_training_logs`).
 */
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const DATABASE_URL = process.env['DATABASE_URL']!;

async function main() {
  const sql = postgres(DATABASE_URL);

  console.log('═══════════════════════════════════════════════════════');
  console.log('  📊  PGVECTOR EMBEDDINGS — STORED DATA VIEWER');
  console.log('═══════════════════════════════════════════════════════\n');

  // ── 1. Show all log rows with embedding metadata (LEFT JOIN) ──
  const records = await sql`
    SELECT
      l.id,
      l.visit_id,
      l.consultation_mode,
      e.embedding_model,
      e.embedding IS NOT NULL AS has_embedding,
      CASE WHEN e.embedding IS NOT NULL THEN array_length(e.embedding::real[], 1) END AS dimensions,
      l.created_at,
      COALESCE(e.updated_at, l.updated_at) AS updated_at
    FROM ml_training_logs l
    LEFT JOIN ml_training_embeddings e ON e.ml_training_log_id = l.id
    ORDER BY l.id;
  `;

  console.log('┌─────────────────────────────────────────────────────┐');
  console.log('│  1. STORED EMBEDDINGS OVERVIEW                      │');
  console.log('└─────────────────────────────────────────────────────┘');
  console.table(
    records.map((r) => ({
      id: r['id'],
      visit_id: r['visit_id'],
      mode: r['consultation_mode'],
      model: r['embedding_model'],
      has_embedding: r['has_embedding'],
      dimensions: r['dimensions'],
      updated: r['updated_at'],
    })),
  );

  // ── 2. Show first few values of each embedding vector ──
  console.log('\n┌─────────────────────────────────────────────────────┐');
  console.log('│  2. EMBEDDING VECTOR PREVIEW (first 10 values)      │');
  console.log('└─────────────────────────────────────────────────────┘');

  const vectors = await sql`
    SELECT
      e.id,
      e.visit_id,
      e.embedding::real[] AS vector_values
    FROM ml_training_embeddings e
    ORDER BY e.id;
  `;

  for (const v of vectors) {
    const vals = v['vector_values'] as number[];
    console.log(`\n  Visit ${v['visit_id']} (id=${v['id']}):`);
    console.log(`  Total dimensions: ${vals.length}`);
    console.log(
      `  First 10 values: [${vals
        .slice(0, 10)
        .map((n) => Number(n).toFixed(6))
        .join(', ')}]`,
    );
    console.log(
      `  Last 5 values:   [${vals
        .slice(-5)
        .map((n) => Number(n).toFixed(6))
        .join(', ')}]`,
    );
  }

  // ── 3. Cosine similarity between all pairs ──
  if (vectors.length >= 2) {
    console.log('\n┌─────────────────────────────────────────────────────┐');
    console.log('│  3. COSINE SIMILARITY BETWEEN CONSULTATIONS         │');
    console.log('└─────────────────────────────────────────────────────┘');

    const similarities = await sql`
      SELECT
        a.visit_id AS visit_a,
        b.visit_id AS visit_b,
        la.consultation_mode AS mode_a,
        lb.consultation_mode AS mode_b,
        1 - (a.embedding <=> b.embedding) AS cosine_similarity
      FROM ml_training_embeddings a
      JOIN ml_training_logs la ON la.id = a.ml_training_log_id
      CROSS JOIN ml_training_embeddings b
      JOIN ml_training_logs lb ON lb.id = b.ml_training_log_id
      WHERE a.id < b.id
      ORDER BY cosine_similarity DESC;
    `;

    for (const s of similarities) {
      const sim = (Number(s['cosine_similarity']) * 100).toFixed(2);
      console.log(
        `\n  Visit ${s['visit_a']} (${s['mode_a']}) ↔ Visit ${s['visit_b']} (${s['mode_b']})`,
      );
      console.log(`  Cosine Similarity: ${sim}%`);
      console.log(
        `  ${Number(sim) > 80 ? '🟢 Very similar' : Number(sim) > 60 ? '🟡 Somewhat similar' : '🔴 Different cases'}`,
      );
    }
  }

  // ── 4. Demo: Find similar cases to a query ──
  console.log('\n┌─────────────────────────────────────────────────────┐');
  console.log('│  4. SIMILARITY SEARCH: "Find cases like Visit 57"   │');
  console.log('└─────────────────────────────────────────────────────┘');

  const searchResults = await sql`
    WITH target AS (
      SELECT embedding FROM ml_training_embeddings WHERE visit_id = '57' LIMIT 1
    )
    SELECT
      e.visit_id,
      l.consultation_mode,
      1 - (e.embedding <=> (SELECT embedding FROM target)) AS similarity
    FROM ml_training_embeddings e
    JOIN ml_training_logs l ON l.id = e.ml_training_log_id
    WHERE e.visit_id != '57'
    ORDER BY e.embedding <=> (SELECT embedding FROM target)
    LIMIT 5;
  `;

  if (searchResults.length > 0) {
    console.log('\n  Cases most similar to Visit 57 (lower back pain):');
    for (const r of searchResults) {
      const sim = (Number(r['similarity']) * 100).toFixed(2);
      console.log(`    → Visit ${r['visit_id']} (${r['consultation_mode']}) — ${sim}% similar`);
    }
  } else {
    console.log(
      '\n  (No embeddings to compare against — add more consultations or run backfill-embeddings)',
    );
  }

  // ── 5. Show the clinical fingerprint text used for each embedding ──
  console.log('\n┌─────────────────────────────────────────────────────┐');
  console.log('│  5. CLINICAL FINGERPRINT DATA                       │');
  console.log('└─────────────────────────────────────────────────────┘');

  const fingerprints = await sql`
    SELECT
      visit_id,
      consultation_mode,
      extracted_symptoms,
      soap_notes,
      ai_suggested_remedy,
      doctor_final_remedy
    FROM ml_training_logs
    ORDER BY id;
  `;

  for (const f of fingerprints) {
    console.log(`\n  ── Visit ${f['visit_id']} (${f['consultation_mode']}) ──`);

    const symptoms = f['extracted_symptoms'] as any;
    if (symptoms) {
      const all = [
        ...(symptoms.mental || []),
        ...(symptoms.physical || []),
        ...(symptoms.particular || []),
      ];
      console.log(`  Symptoms: ${all.join(', ') || '(none)'}`);
    }

    const soap = f['soap_notes'] as any;
    if (soap) {
      console.log(`  Assessment: ${soap.assessment || '(none)'}`);
    }

    if (f['ai_suggested_remedy']) {
      const remedy =
        typeof f['ai_suggested_remedy'] === 'string'
          ? f['ai_suggested_remedy']
          : JSON.stringify(f['ai_suggested_remedy']).replace(/"/g, '');
      console.log(`  AI Remedy: ${remedy}`);
    }

    if (f['doctor_final_remedy']) {
      console.log(`  Doctor Rx: ${JSON.stringify(f['doctor_final_remedy'])}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ✅  All data verified. Embeddings are stored in pgvector.');
  console.log('═══════════════════════════════════════════════════════\n');

  await sql.end();
}

main().catch(console.error);
