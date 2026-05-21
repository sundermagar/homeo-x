import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnv = path.resolve(__dirname, '../../../../.env');

dotenv.config({ path: rootEnv });

const DATABASE_URL = process.env['DATABASE_URL']!;
const dataPath = path.resolve(__dirname, 'legacy_remedy_full.json');

async function main() {
  const sql = postgres(DATABASE_URL, { max: 10 });

  if (!fs.existsSync(dataPath)) {
    console.error('❌ Data file not found:', dataPath);
    process.exit(1);
  }

  const { nodes, alternatives } = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`📋 Loading ${nodes.length} nodes and ${alternatives.length} alternatives`);

  if (process.env['FORCE_CLEAR'] === 'true') {
    console.log('🗑️ Clearing existing remedy data...');
    await sql`TRUNCATE TABLE public.remedy_tree_nodes RESTART IDENTITY CASCADE`;
  }

  console.log('🏗️ Inserting nodes in batches...');
  const batchSize = 100;
  for (let i = 0; i < nodes.length; i += batchSize) {
    const batch = nodes.slice(i, i + batchSize).map((n: any) => ({
      id: n.id,
      label: (n.label || '').substring(0, 255),
      parent_id: n.parent_id || 0,
      hindi_label: n.hindi_label || null,
      gujrati_label: n.gujrati_label || null,
      marathi_label: n.marathi_label || null,
      punjabi_label: n.punjabi_label || null,
      malyalum_label: n.malyalum_label || null,
      kannad_label: n.kannad_label || null,
      bengali_label: n.bengali_label || null,
      french_label: n.french_label || null,
      german_label: n.german_label || null,
      spanish_label: n.spanish_label || null
    }));

    await sql`
      INSERT INTO public.remedy_tree_nodes ${sql(batch)}
      ON CONFLICT (id) DO UPDATE SET
        label = EXCLUDED.label,
        parent_id = EXCLUDED.parent_id
    `;
    console.log(`  ✅ Nodes: ${Math.min(i + batchSize, nodes.length)} / ${nodes.length}`);
  }

  console.log('🏗️ Inserting alternatives...');
  const nodeIds = new Set(nodes.map((n: any) => n.id));
  const validAlternatives = alternatives.filter((a: any) => nodeIds.has(a.tree_id));
  console.log(`  (Filtered out ${alternatives.length - validAlternatives.length} invalid alternatives)`);

  if (validAlternatives.length > 0) {
    const altBatch = validAlternatives.map((a: any) => ({
      id: a.id,
      tree_id: a.tree_id,
      remedy: (a.remedy || '').substring(0, 255),
      potency: (a.potency || '').substring(0, 100) || null,
      notes: a.notes || null
    }));

    await sql`
      INSERT INTO public.remedy_alternatives ${sql(altBatch)}
      ON CONFLICT (id) DO UPDATE SET
        remedy = EXCLUDED.remedy
    `;
  }

  await sql`SELECT setval('public.remedy_tree_nodes_id_seq', (SELECT MAX(id) FROM public.remedy_tree_nodes))`;
  
  await sql.end();
  console.log('\n🎉 Seeding complete!');
}

main().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
