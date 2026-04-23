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

console.log('────────────────────────────────────────────────────────────────');
console.log(`[Env] STARTUP DIAGNOSTICS`);
console.log(`[Env] CWD: ${process.cwd()}`);
console.log(`[Env] __dirname: ${__dirname}`);
console.log(`[Env] Searching in ${searchPaths.length} locations...`);

for (const p of searchPaths) {
  const exists = fs.existsSync(p);
  if (exists) {
    console.log(`[Env] ✅ FOUND .env: ${p}`);
    dotenv.config({ path: p });
  }
}

if (process.env.JWT_SECRET) {
  console.log(`[Env] ✅ JWT_SECRET is LOADED (Length: ${process.env.JWT_SECRET.length})`);
} else {
  console.error(`[Env] ❌ ERROR: JWT_SECRET IS MISSING FROM ENVIRONMENT`);
  console.log(`[Env] Available keys: ${Object.keys(process.env).filter(k => !k.includes('PASS') && !k.includes('SECRET')).join(', ')}`);
}

console.log(`[Env] NODE_ENV: ${process.env.NODE_ENV}`);
console.log('────────────────────────────────────────────────────────────────');

