import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Extraction script to consolidate remedy data from multiple legacy SQL files.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SQL_DIR = path.resolve(__dirname, '../../../../managemyclicnicnew/databasebackup');
const OUTPUT_FILE = path.resolve(__dirname, 'legacy_remedy_full.json');

interface Node {
  id: number;
  label: string;
  parent_id: number;
  hindi_label?: string;
  gujrati_label?: string;
  punjabi_label?: string;
  malyalum_label?: string;
  kannad_label?: string;
  bengali_label?: string;
  marathi_label?: string;
  french_label?: string;
  german_label?: string;
  spanish_label?: string;
}

interface Alternative {
  id: number;
  tree_id: number;
  remedy: string;
  potency?: string;
  notes?: string;
}

const nodes: Record<number, Node> = {};
const alternatives: Record<number, Alternative> = {};

function parseSql(content: string) {
  // Regex for managetreedatas
  // Example: (1, 'Abscesses and boils', 0, 'फोड़े और फोड़े', ...)
  const treeRegex = /INSERT INTO `managetreedatas`[^;]+VALUES\s*([\s\S]+?);/g;
  let match;
  while ((match = treeRegex.exec(content)) !== null) {
    const values = match[1];
    if (!values) continue;
    const rows = values.split(/\),\s*\(/);
    for (let row of rows) {
      row = row.replace(/^\s*\(/, '').replace(/\)\s*$/, '');
      const cols = row.split(/,(?=(?:(?:[^']*'){2})*[^']*$)/).map(c => c.trim().replace(/^'|'$/g, ''));
      if (cols.length >= 3) {
        const id = parseInt(cols[0] || '0');
        if (!nodes[id]) {
          nodes[id] = {
            id,
            label: cols[1] || '',
            parent_id: parseInt(cols[2] || '0') || 0,
            hindi_label: cols[3],
            gujrati_label: cols[4],
            punjabi_label: cols[5],
            malyalum_label: cols[6],
            kannad_label: cols[7],
            bengali_label: cols[8],
            marathi_label: cols[9],
            french_label: cols[10],
            german_label: cols[11],
            spanish_label: cols[12]
          };
        }
      }
    }
  }

  // Regex for medicine_others
  const altRegex = /INSERT INTO `medicine_others`[^;]+VALUES\s*([\s\S]+?);/g;
  while ((match = altRegex.exec(content)) !== null) {
    const values = match[1];
    if (!values) continue;
    const rows = values.split(/\),\s*\(/);
    for (let row of rows) {
      row = row.replace(/^\s*\(/, '').replace(/\)\s*$/, '');
      const cols = row.split(/,(?=(?:(?:[^']*'){2})*[^']*$)/).map(c => c.trim().replace(/^'|'$/g, ''));
      if (cols.length >= 3) {
        const id = parseInt(cols[0] || '0');
        if (!alternatives[id]) {
          alternatives[id] = {
            id,
            tree_id: parseInt(cols[1] || '0'),
            remedy: cols[2] || '',
            potency: (cols[3] && cols[3] !== 'NULL') ? cols[3] : undefined,
            notes: cols[4] !== 'NULL' ? cols[4] : undefined
          };
        }
      }
    }
  }
}

if (!fs.existsSync(SQL_DIR)) {
  console.error(`Error: SQL directory not found at ${SQL_DIR}`);
  process.exit(1);
}

const files = fs.readdirSync(SQL_DIR).filter(f => f.endsWith('.sql'));
console.log(`Processing ${files.length} SQL files...`);

for (const file of files) {
  console.log(`  - ${file}`);
  const content = fs.readFileSync(path.join(SQL_DIR, file), 'utf-8');
  parseSql(content);
}

const result = {
  nodes: Object.values(nodes),
  alternatives: Object.values(alternatives)
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
console.log(`\nSuccess! Extracted ${result.nodes.length} nodes and ${result.alternatives.length} alternatives.`);
console.log(`Saved to ${OUTPUT_FILE}`);
