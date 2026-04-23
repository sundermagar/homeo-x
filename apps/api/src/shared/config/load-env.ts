import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Potential locations for .env
const searchPaths = [
  path.join(process.cwd(), '.env'),
  path.join(__dirname, '../../../.env'),
  path.join(__dirname, '../../../../.env'),
  path.resolve('/app/.env'),
];

console.log(`[Env] Searching for .env files in ${searchPaths.length} locations...`);

for (const p of searchPaths) {
  if (fs.existsSync(p)) {
    console.log(`[Env] Found .env at: ${p}`);
    dotenv.config({ path: p });
  } else {
    console.log(`[Env] No .env at: ${p}`);
  }
}

if (!process.env.JWT_SECRET) {
  console.warn('[Env] WARNING: JWT_SECRET still not found after searching common paths.');
}

