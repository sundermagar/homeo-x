import { createDbClient } from '../client';
import { seedClinicalCodes } from './clinical-codes-seed';
import fs from 'fs';
import path from 'path';

// Manual .env loader
const envPath = path.join(process.cwd(), '../../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      process.env[key.trim()] = values.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

async function main() {
  const dbUrl = process.env['DATABASE_URL'];
  if (!dbUrl) {
    console.error('[Seed] DATABASE_URL not found in environment');
    process.exit(1);
  }

  try {
    const db = createDbClient(dbUrl, 'tenant_demo');
    await seedClinicalCodes(db);
    console.log('[Seed] Done.');
  } catch (err) {
    console.error('[Seed] Failed:', err);
  }
  process.exit(0);
}

main();
