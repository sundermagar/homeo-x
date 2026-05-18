/**
 * Export verified consultations from `ml_training_logs` into a ChatML JSONL
 * training set for local Qwen fine-tuning.
 *
 * For each verified row (doctor_final_remedy + all 4 phase fields present),
 * we kNN-query ml_training_embeddings via pgvector cosine similarity to pull
 * the 2 most similar past cases, and inject them as RAG context.
 *
 * Outputs go to <repo>/ml-pipeline/output/:
 *   - train.jsonl          (90% stratified by doctor_final_remedy.name)
 *   - val.jsonl            (10% holdout)
 *   - dataset_card.json    (counts, distribution, fingerprint hashes)
 *
 * State (incremental bookmark) goes to <repo>/ml-pipeline/state/last_run.json.
 *
 * Run:
 *   pnpm train:export              # incremental (rows newer than last_run)
 *   pnpm train:export -- --full    # rebuild from scratch
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { createDbClient } from '@mmc/database';
import { sql } from 'drizzle-orm';

// ─── Paths ─────────────────────────────────────────────────────────────────────
const REPO_ROOT = path.resolve(__dirname, '../../../../');
const PIPELINE_DIR = path.join(REPO_ROOT, 'ml-pipeline');
const OUTPUT_DIR = path.join(PIPELINE_DIR, 'output');
const STATE_DIR = path.join(PIPELINE_DIR, 'state');
const SYSTEM_PROMPT_PATH = path.join(PIPELINE_DIR, 'prompts', 'system.txt');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(STATE_DIR, { recursive: true });

const STATE_FILE = path.join(STATE_DIR, 'last_run.json');
const TRAIN_FILE = path.join(OUTPUT_DIR, 'train.jsonl');
const VAL_FILE = path.join(OUTPUT_DIR, 'val.jsonl');
const CARD_FILE = path.join(OUTPUT_DIR, 'dataset_card.json');

// ─── CLI args ──────────────────────────────────────────────────────────────────
const FULL_REBUILD = process.argv.includes('--full');
const TOP_K_RAG = 2;
const VAL_RATIO = 0.1;

// ─── Types ─────────────────────────────────────────────────────────────────────
type TrainingRow = {
  id: number;
  visit_id: string;
  consultation_mode: string | null;
  patient_context: any;
  extracted_symptoms: any;
  mapped_rubrics: any;
  repertorization_matrix: any;
  doctor_final_remedy: any;
  soap_notes: any;
  updated_at: Date;
};

type SimilarCase = {
  id: number;
  extracted_symptoms: any;
  mapped_rubrics: any;
  doctor_final_remedy: any;
  distance: number;
};

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

// ─── Helpers ───────────────────────────────────────────────────────────────────
function loadState(): { lastUpdatedAt: string | null; version: number } {
  if (!fs.existsSync(STATE_FILE)) return { lastUpdatedAt: null, version: 0 };
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return { lastUpdatedAt: null, version: 0 };
  }
}

function saveState(state: { lastUpdatedAt: string | null; version: number }) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function asArray<T = any>(v: any): T[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return [];
}

function formatSymptoms(s: any): string {
  if (!s) return '(none recorded)';
  const mental = asArray(s.mental).map((x: any) => `  - ${typeof x === 'string' ? x : x?.description || JSON.stringify(x)}`).join('\n');
  const physical = asArray(s.physical).map((x: any) => `  - ${typeof x === 'string' ? x : x?.description || JSON.stringify(x)}`).join('\n');
  const particular = asArray(s.particular).map((x: any) => `  - ${typeof x === 'string' ? x : x?.description || JSON.stringify(x)}`).join('\n');
  return [
    `MIND / MENTAL:\n${mental || '  (none)'}`,
    `PHYSICAL GENERALS:\n${physical || '  (none)'}`,
    `PARTICULARS:\n${particular || '  (none)'}`,
  ].join('\n\n');
}

function formatPatientContext(pc: any): string {
  if (!pc || typeof pc !== 'object') return '';
  const parts: string[] = [];
  if (pc.age) parts.push(`Age: ${pc.age}`);
  if (pc.gender) parts.push(`Gender: ${pc.gender}`);
  if (pc.chronicHistory) parts.push(`History: ${pc.chronicHistory}`);
  if (pc.vitals) parts.push(`Vitals: ${JSON.stringify(pc.vitals)}`);
  return parts.length ? `Patient: ${parts.join(' | ')}` : '';
}

function extractDoctorRemedy(dfr: any): { name: string; potency: string; dosage: string; reasoning: string } {
  // doctor_final_remedy is stored as an ARRAY of { remedyName, potency, frequency, duration, instructions }.
  // Fallback: support legacy single-object shape as well.
  const first = Array.isArray(dfr) ? dfr[0] : dfr;
  if (!first || typeof first !== 'object') {
    return { name: '', potency: '', dosage: '', reasoning: '' };
  }
  const name = first.remedyName || first.name || first.remedy || '';
  const potency = first.potency || '';
  const dosage = [first.frequency, first.duration].filter(Boolean).join(', ');
  const reasoning = first.instructions || first.reasoning || first.rationale || '';
  return { name, potency, dosage, reasoning };
}

function formatSimilarCase(c: SimilarCase, idx: number): string {
  const { name: remedyName, potency } = extractDoctorRemedy(c.doctor_final_remedy);
  const rubricList = asArray(c.mapped_rubrics)
    .slice(0, 6)
    .map((r: any) => `${r?.rubricName || r?.rubricDescription || r?.name || ''}`)
    .filter(Boolean)
    .join('; ');
  return [
    `[Past Case ${idx + 1}] (similarity ${(1 - c.distance).toFixed(3)})`,
    formatSymptoms(c.extracted_symptoms).split('\n').map((l) => '  ' + l).join('\n'),
    `  Key rubrics: ${rubricList || '(none)'}`,
    `  Doctor prescribed: ${remedyName || 'Unknown'} ${potency}`.trim(),
  ].join('\n');
}

function buildUserMessage(row: TrainingRow, similar: SimilarCase[]): string {
  const context = formatPatientContext(row.patient_context);
  const symptoms = formatSymptoms(row.extracted_symptoms);
  const mode = row.consultation_mode || 'chronic';
  const ragBlock = similar.length
    ? similar.map((c, i) => formatSimilarCase(c, i)).join('\n\n')
    : '(no similar past cases found)';

  return [
    `Consultation type: ${mode}`,
    context,
    '',
    '=== CURRENT PATIENT ===',
    symptoms,
    '',
    '=== SIMILAR PAST CASES (for reference only) ===',
    ragBlock,
    '',
    'Analyze the totality and respond with the JSON object specified in the system prompt.',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildAssistantMessage(row: TrainingRow): string {
  // mapped_rubrics: stored as [{ rubricId, rubricName, category, importance, grade }]
  // (the consultation logger auto-extracts this from repertorization_matrix.scoredRemedies[].coverage)
  let rubricSource = asArray(row.mapped_rubrics);

  // Fallback: derive rubrics from the repertorization matrix coverage if mapped_rubrics is empty.
  if (rubricSource.length === 0) {
    const matrix: any = row.repertorization_matrix || {};
    const scored: any[] = matrix.scoredRemedies || matrix.topRemedies || [];
    const seen = new Map<string, any>();
    for (const remedy of scored) {
      for (const c of asArray(remedy?.coverage)) {
        if (!c?.rubricId) continue;
        const existing = seen.get(c.rubricId);
        if (!existing || (c.grade ?? 0) > (existing.grade ?? 0)) {
          seen.set(c.rubricId, {
            rubricId: c.rubricId,
            rubricName: c.rubricDescription,
            category: c.rubricCategory,
            grade: c.grade,
          });
        }
      }
    }
    rubricSource = [...seen.values()];
  }

  const mappedRubrics = rubricSource.map((r: any) => ({
    rubricId: r?.rubricId || r?.id || '',
    rubricName: r?.rubricName || r?.rubricDescription || r?.name || '',
    category: r?.category || r?.rubricCategory || 'PARTICULAR',
    grade: Number(r?.grade ?? 1),
  }));

  // repertorization_matrix.scoredRemedies use { remedyName, totalScore, coveredRubricCount }
  const matrix: any = row.repertorization_matrix || {};
  const scored = asArray(matrix.scoredRemedies || matrix.topRemedies);
  const topRemedies = scored.slice(0, 5).map((r: any) => ({
    remedy: r?.remedyName || r?.remedy || r?.name || '',
    score: Number(r?.totalScore ?? r?.normalizedScore ?? r?.score ?? 0),
    rubricMatches: Number(r?.coveredRubricCount ?? r?.rubricMatches ?? r?.matchCount ?? 0),
  }));

  // doctor_final_remedy is an array of { remedyName, potency, frequency, duration, instructions }
  const suggestedRemedy = extractDoctorRemedy(row.doctor_final_remedy);

  return JSON.stringify({
    mappedRubrics,
    repertorization: { topRemedies },
    suggestedRemedy,
  });
}

function stratifiedSplit<T extends { remedyKey: string }>(rows: T[], valRatio: number): { train: T[]; val: T[] } {
  const byClass = new Map<string, T[]>();
  for (const r of rows) {
    const arr = byClass.get(r.remedyKey) || [];
    arr.push(r);
    byClass.set(r.remedyKey, arr);
  }
  const train: T[] = [];
  const val: T[] = [];
  for (const [, arr] of byClass) {
    // shuffle deterministically per-class
    arr.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    const valCount = Math.max(arr.length >= 2 ? 1 : 0, Math.round(arr.length * valRatio));
    val.push(...arr.slice(0, valCount));
    train.push(...arr.slice(valCount));
  }
  return { train, val };
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const DATABASE_URL = process.env['DATABASE_URL'];
  if (!DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  if (!fs.existsSync(SYSTEM_PROMPT_PATH)) {
    console.error(`System prompt missing at ${SYSTEM_PROMPT_PATH}`);
    process.exit(1);
  }
  const systemPrompt = fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf-8').trim();

  const db = createDbClient(DATABASE_URL);
  const state = loadState();
  const sinceTs = FULL_REBUILD ? null : state.lastUpdatedAt;

  console.log(`[export] mode=${FULL_REBUILD ? 'FULL' : 'INCREMENTAL'}`);
  console.log(`[export] since=${sinceTs ?? '(beginning of time)'}`);

  // Fetch eligible training rows.
  // Minimum requirements: a doctor's final remedy (ground truth) + extracted symptoms (input).
  // mapped_rubrics + soap_notes + repertorization_matrix are used opportunistically when present.
  const rowsResult = await db.execute(sql`
    SELECT
      l.id, l.visit_id, l.consultation_mode,
      l.patient_context, l.extracted_symptoms, l.mapped_rubrics,
      l.repertorization_matrix, l.doctor_final_remedy, l.soap_notes,
      l.updated_at
    FROM tenant_demo.ml_training_logs l
    WHERE l.doctor_final_remedy IS NOT NULL
      AND jsonb_typeof(l.doctor_final_remedy) <> 'null'
      AND l.extracted_symptoms IS NOT NULL
      AND (${sinceTs}::timestamp IS NULL OR l.updated_at > ${sinceTs}::timestamp)
    ORDER BY l.updated_at ASC
  `);
  const rows = (rowsResult as any).rows ?? (rowsResult as any) ?? [];
  const trainingRows: TrainingRow[] = rows as TrainingRow[];

  console.log(`[export] eligible rows: ${trainingRows.length}`);

  if (trainingRows.length === 0) {
    console.log('[export] nothing new to export. Exiting.');
    await (db as any).$client?.end?.();
    return;
  }

  // For each row, fetch top-K similar past cases via pgvector.
  type Sample = { row: TrainingRow; similar: SimilarCase[]; remedyKey: string };
  const samples: Sample[] = [];

  for (let i = 0; i < trainingRows.length; i++) {
    const row = trainingRows[i]!;
    process.stdout.write(`\r[export] processing ${i + 1}/${trainingRows.length} (visit ${row.visit_id})…    `);

    const simResult = await db.execute(sql`
      WITH self AS (
        SELECT embedding FROM tenant_demo.ml_training_embeddings
        WHERE ml_training_log_id = ${row.id}
        LIMIT 1
      )
      SELECT
        l.id,
        l.extracted_symptoms,
        l.mapped_rubrics,
        l.doctor_final_remedy,
        (e.embedding <=> (SELECT embedding FROM self)) AS distance
      FROM tenant_demo.ml_training_embeddings e
      JOIN tenant_demo.ml_training_logs l ON l.id = e.ml_training_log_id
      WHERE l.id <> ${row.id}
        AND l.doctor_final_remedy IS NOT NULL
        AND EXISTS (SELECT 1 FROM self)
      ORDER BY distance ASC
      LIMIT ${TOP_K_RAG}
    `);
    const similar = ((simResult as any).rows ?? (simResult as any) ?? []) as SimilarCase[];

    const { name: remedyName } = extractDoctorRemedy(row.doctor_final_remedy);
    const remedyKey = (remedyName || 'unknown').toLowerCase().trim();
    samples.push({ row, similar, remedyKey });
  }
  process.stdout.write('\n');

  // Stratified split.
  const { train, val } = stratifiedSplit(samples, VAL_RATIO);
  console.log(`[export] split: train=${train.length}, val=${val.length}`);

  const writeJsonl = (file: string, items: Sample[]) => {
    const fd = fs.openSync(file, 'w');
    for (const s of items) {
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildUserMessage(s.row, s.similar) },
        { role: 'assistant', content: buildAssistantMessage(s.row) },
      ];
      fs.writeSync(fd, JSON.stringify({ messages }) + '\n');
    }
    fs.closeSync(fd);
  };

  writeJsonl(TRAIN_FILE, train);
  writeJsonl(VAL_FILE, val);

  // Remedy distribution.
  const distribution: Record<string, { train: number; val: number }> = {};
  for (const s of train) {
    distribution[s.remedyKey] ??= { train: 0, val: 0 };
    distribution[s.remedyKey]!.train++;
  }
  for (const s of val) {
    distribution[s.remedyKey] ??= { train: 0, val: 0 };
    distribution[s.remedyKey]!.val++;
  }

  const lastUpdatedAt = trainingRows[trainingRows.length - 1]!.updated_at;
  const card = {
    generatedAt: new Date().toISOString(),
    mode: FULL_REBUILD ? 'full' : 'incremental',
    totalRows: trainingRows.length,
    trainRows: train.length,
    valRows: val.length,
    uniqueRemedies: Object.keys(distribution).length,
    topRemedies: Object.entries(distribution)
      .sort((a, b) => (b[1].train + b[1].val) - (a[1].train + a[1].val))
      .slice(0, 20)
      .map(([name, c]) => ({ name, ...c })),
    sinceTimestamp: sinceTs,
    upToTimestamp: lastUpdatedAt,
    nextVersion: state.version + 1,
  };
  fs.writeFileSync(CARD_FILE, JSON.stringify(card, null, 2));

  saveState({
    lastUpdatedAt: new Date(lastUpdatedAt).toISOString(),
    version: state.version + 1,
  });

  console.log(`[export] wrote ${TRAIN_FILE}`);
  console.log(`[export] wrote ${VAL_FILE}`);
  console.log(`[export] wrote ${CARD_FILE}`);
  console.log(`[export] unique remedies: ${card.uniqueRemedies}`);
  console.log(`[export] top 5: ${card.topRemedies.slice(0, 5).map((r) => `${r.name}(${r.train + r.val})`).join(', ')}`);

  await (db as any).$client?.end?.();
}

main().catch((err) => {
  console.error('[export] FATAL:', err);
  process.exit(1);
});
