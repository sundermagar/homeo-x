import { remedyTreeNodes, remedyAlternatives } from '../schema/medical-cases';
import { sql } from 'drizzle-orm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BLACKLIST = new Set([
  'unnamed', 'no', 'yes', 'other', 'n/a', 'nil', '-', '.', '0', '1',
  'none', 'undefined', 'null', 'test', 'demo'
]);

function isTrashLabel(label: string | null): boolean {
  if (!label) return true;
  const clean = label.trim().toLowerCase();
  if (BLACKLIST.has(clean)) return true;
  if (/^\d+$/.test(clean)) return true;
  if (clean.length < 2 && !/[a-z0-9]/i.test(clean)) return true;
  return false;
}

export async function seedRemedyChart(db: any) {
  console.log('🌱 Seeding production AI Remedy Chart data...');

  // 1. Clear existing data
  await db.execute(sql`TRUNCATE TABLE ${remedyAlternatives} RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${remedyTreeNodes} RESTART IDENTITY CASCADE`);

  // 2. Load data dynamically to avoid memory/esbuild issues
  const dataPath = path.resolve(__dirname, 'legacy_remedy_data.json');
  if (!fs.existsSync(dataPath)) {
    console.warn(`[Seed] legacy_remedy_data.json missing, falling back to comprehensive...`);
    // falling back to comprehensive if legacy is missing for some reason
    const fallbackPath = path.resolve(__dirname, 'comprehensive_remedy_data.json');
    if (!fs.existsSync(fallbackPath)) {
      console.error(`[Seed] No remedy data files found.`);
      return;
    }
  }
  
  const legacyData = JSON.parse(fs.readFileSync(fs.existsSync(dataPath) ? dataPath : path.resolve(__dirname, 'comprehensive_remedy_data.json'), 'utf-8'));
  const { tree: rawTree, alternatives: rawAlts } = legacyData;

  // ── PASS 1: Build id→node map ─────────────────────────────────────────────
  const allNodesMap = new Map<number, any>();
  for (const node of rawTree) {
    const nid = Number(node.id);
    if (isNaN(nid)) continue;

    // Collect translations for description
    const translations = [
      node.hindi    && `Hindi: ${node.hindi}`,
      node.gujarati && `Gujarati: ${node.gujarati}`,
      node.punjabi  && `Punjabi: ${node.punjabi}`,
      node.marathi  && `Marathi: ${node.marathi}`,
    ].filter(Boolean).join(' | ');

    allNodesMap.set(nid, {
      id: nid,
      label: node.label || '',
      parentId: Number(node.parent_id ?? 0),
      description: node.description || translations || null,
    });
  }

  // ── PASS 2: Identify valid nodes (Allow structural Yes/No) ─────────────────
  const keptIds = new Set<number>();
  for (const node of rawTree) {
    const label = (node.label || '').trim().toLowerCase();
    // Special case: allow 'yes' and 'no' for diagnostic trees
    const isStructural = label === 'yes' || label === 'no';
    
    if (isStructural || !isTrashLabel(node.label)) {
      keptIds.add(Number(node.id));
    }
  }

  const sanitizedTreeNodes: any[] = [];
  for (const nid of keptIds) {
    const node = allNodesMap.get(nid);
    let currPid = node.parentId;
    let depth = 0;
    
    // Reparent orphaned nodes to the nearest valid ancestor
    while (currPid !== 0 && !keptIds.has(currPid) && depth < 30) {
      const parentNode = allNodesMap.get(currPid);
      if (!parentNode) { currPid = 0; break; }
      currPid = parentNode.parentId;
      depth++;
    }
    if (depth >= 30) currPid = 0;

    sanitizedTreeNodes.push({
      id: nid,
      parentId: currPid,
      label: (node.label || '').substring(0, 255),
      description: node.description,
      nodeType: 'RUBRIC',
      isActive: true,
    });
  }

  // ── PASS 3: Insert tree nodes in chunks ────────────────────────────────────
  const chunkSize = 200;
  console.log(`   Inserting ${sanitizedTreeNodes.length} rubrics from legacy data...`);
  for (let i = 0; i < sanitizedTreeNodes.length; i += chunkSize) {
    const chunk = sanitizedTreeNodes.slice(i, i + chunkSize);
    await db.insert(remedyTreeNodes).values(chunk);
    if (i % 1000 === 0) console.log(`   Progress: ${i}/${sanitizedTreeNodes.length}`);
  }

  // ── PASS 4: Assemble & insert remedy alternatives ─────────────────────────
  const sanitizedAlts: any[] = [];
  for (const alt of rawAlts) {
    if (isTrashLabel(alt.remedy)) continue;
    
    let currTid = Number(alt.tree_id ?? 0);
    let depth = 0;
    
    // Ensure the alternative attaches to a valid node (or its nearest ancestor)
    while (currTid !== 0 && !keptIds.has(currTid) && depth < 30) {
      const pnode = allNodesMap.get(currTid);
      if (!pnode) { currTid = 0; break; }
      currTid = pnode.parentId;
      depth++;
    }
    if (currTid === 0 || !keptIds.has(currTid)) continue;

    const remedy = (alt.remedy || '').trim().substring(0, 255);
    const notes = [
      alt.symptoms || '',
      alt.better   ? `Better: ${alt.better}`   : '',
      alt.worse    ? `Worse: ${alt.worse}`     : '',
    ].filter(Boolean).join('\n');

    sanitizedAlts.push({ 
      treeId: currTid, 
      remedy, 
      notes: notes.trim() || null 
    });
  }

  console.log(`   Inserting ${sanitizedAlts.length} remedy suggestions (alternatives)...`);
  for (let i = 0; i < sanitizedAlts.length; i += chunkSize) {
    const chunk = sanitizedAlts.slice(i, i + chunkSize);
    await db.insert(remedyAlternatives).values(chunk);
  }

  // 7. Sync Sequences
  await db.execute(sql`SELECT setval(pg_get_serial_sequence('remedy_tree_nodes', 'id'), (SELECT COALESCE(MAX(id), 1) FROM remedy_tree_nodes))`);
  await db.execute(sql`SELECT setval(pg_get_serial_sequence('remedy_alternatives', 'id'), (SELECT COALESCE(MAX(id), 1) FROM remedy_alternatives))`);

  console.log('✅ AI Remedy Chart seeding complete (Optimized Hierarchy)!');
}
