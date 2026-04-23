import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Potential locations for .env
const searchPaths: string[] = [
  path.join(process.cwd(), '.env'),
  path.resolve('/app/.env'),
];

// Go up from __dirname to find .env
let curr = __dirname;
for (let i = 0; i < 6; i++) {
  searchPaths.push(path.join(curr, '.env'));
  curr = path.dirname(curr);
}

console.log(`[Env] Searching for .env files in ${searchPaths.length} locations...`);

for (const p of searchPaths) {
  if (fs.existsSync(p)) {
    console.log(`[Env] ✅ Found .env at: ${p}`);
    dotenv.config({ path: p });
  } else {
    // Silently continue
  }
}

if (!process.env.JWT_SECRET) {
  console.warn('[Env] WARNING: JWT_SECRET still not found after searching common paths.');
} else {
  console.log('[Env] ✅ JWT_SECRET is present in process.env');
}

console.log(`[Env] Current NODE_ENV: ${process.env.NODE_ENV}`);

