import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnv = path.resolve(__dirname, '../../../../.env');
dotenv.config({ path: rootEnv });

const DATABASE_URL = process.env['DATABASE_URL']!;
const GEMINI_API_KEY = process.env['GEMINI_API_KEY']?.split(',')[0];

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in .env');
  process.exit(1);
}

const MODEL = "models/gemini-embedding-001";
const BATCH_SIZE = 50;

async function getBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${GEMINI_API_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: texts.map(text => ({
        model: MODEL,
        content: { parts: [{ text }] }
      }))
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${err}`);
  }

  const data = await response.json() as any;
  return data.embeddings.map((e: any) => e.values);
}

async function main() {
  const sql = postgres(DATABASE_URL);
  
  console.log('🔌 Connected to database');

  const schemas = await sql<{ schema_name: string }[]>`
    SELECT schema_name FROM information_schema.schemata
    WHERE schema_name LIKE 'tenant_%'
    ORDER BY schema_name
  `;

  console.log(`📋 Processing ${schemas.length} tenants...`);

  for (const { schema_name } of schemas) {
    console.log(`\n🏗️  Schema: [${schema_name}]`);
    
    const nodes = await sql.unsafe(`
      SELECT id, label, description FROM "${schema_name}"."remedy_tree_nodes"
      WHERE embedding IS NULL AND (label IS NOT NULL OR description IS NOT NULL)
    `);

    if (nodes.length === 0) {
      console.log(`  ✅ All nodes already have embeddings.`);
      continue;
    }

    console.log(`  ⏳ Found ${nodes.length} nodes needing embeddings...`);

    for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
      const batch = nodes.slice(i, i + BATCH_SIZE);
      const texts = batch.map(n => `${n['label'] || ''} ${n['description'] || ''}`.trim()).filter(Boolean);
      
      if (texts.length === 0) continue;

      try {
        const embeddings = await getBatchEmbeddings(texts);
        
        for (let j = 0; j < batch.length; j++) {
          const emb = embeddings[j];
          const nodeId = batch[j]?.['id'];
          if (emb && nodeId !== undefined) {
            await sql.unsafe(`
              UPDATE "${schema_name}"."remedy_tree_nodes"
              SET embedding = $1
              WHERE id = $2
            `, [JSON.stringify(emb), nodeId]);
          }
        }

        process.stdout.write(`[Batch ${i/BATCH_SIZE + 1} ✅] `);
      } catch (e: any) {
        console.error(`\n  ❌ Error in batch ${i/BATCH_SIZE + 1}: ${e.message}`);
        if (e.message.includes('429')) {
          console.log('  💤 Rate limited, sleeping for 30s...');
          await new Promise(r => setTimeout(r, 30000));
          i -= BATCH_SIZE; // Retry this batch
        }
      }
    }
    console.log(`\n  ✅ ${schema_name} complete!`);
  }

  await sql.end();
  console.log('\n🎉 All embeddings seeded!');
}

main().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
