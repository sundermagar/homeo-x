import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

dotenv.config({ path: path.join(process.cwd(), '../../.env') });

const dbUrl = process.env['DATABASE_URL'];
if (!dbUrl) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

function getSha256(content: string) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function main() {
  const migrationsFolder = path.join(process.cwd(), 'src', 'migrations');
  const files = fs.readdirSync(migrationsFolder).filter(f => f.endsWith('.sql')).sort();
  
  console.log('=== Migration Files & Hashes ===');
  const fileHashes: { [key: string]: { lf: string; crlf: string } } = {};
  for (const file of files) {
    const rawContent = fs.readFileSync(path.join(migrationsFolder, file), 'utf8');
    const lfContent = rawContent.replace(/\r\n/g, '\n');
    const crlfContent = lfContent.replace(/\n/g, '\r\n');
    const lfHash = getSha256(lfContent);
    const crlfHash = getSha256(crlfContent);
    fileHashes[file] = { lf: lfHash, crlf: crlfHash };
    console.log(`${file} | LF: ${lfHash} | CRLF: ${crlfHash}`);
  }

  const sql = postgres(dbUrl as string, { max: 1 });
  
  console.log('\n=== Applied Migrations in tenant_demo ===');
  try {
    const dbMigrations = await sql`SELECT * FROM tenant_demo.__drizzle_migrations ORDER BY id`;
    for (const m of dbMigrations) {
      const mHash = m['hash'] as string;
      const mId = m['id'];
      const match = Object.keys(fileHashes).find(k => {
        const entry = fileHashes[k];
        return entry ? (entry.lf === mHash || entry.crlf === mHash) : false;
      });
      console.log(`ID: ${mId} | Hash: ${mHash.substring(0, 16)}... | File: ${match || 'UNKNOWN'}`);
    }
  } catch (err: any) {
    console.error('Error:', err.message);
  }

  await sql.end();
}

main().catch(console.error);
