import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../../.env') });

const dbUrl = process.env['DATABASE_URL'];
if (!dbUrl) {
  console.error('❌ DATABASE_URL is not set.');
  process.exit(1);
}

// Parse URL to connect to the 'postgres' maintenance DB instead of the target DB
const urlObj = new URL(dbUrl);
const targetDb = urlObj.pathname.replace('/', '');
urlObj.pathname = '/postgres';
const adminUrl = urlObj.toString();

async function main() {
  console.log(`🔌 Connecting to maintenance DB to reset "${targetDb}"...`);
  const sqlAdmin = postgres(adminUrl);

  try {
    console.log(`💥 Terminating active connections to "${targetDb}"...`);
    await sqlAdmin.unsafe(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${targetDb}'
        AND pid <> pg_backend_pid();
    `);

    console.log(`🗑️ Dropping database "${targetDb}"...`);
    await sqlAdmin.unsafe(`DROP DATABASE IF EXISTS "${targetDb}"`);

    console.log(`✨ Recreating database "${targetDb}"...`);
    await sqlAdmin.unsafe(`CREATE DATABASE "${targetDb}"`);
    console.log(`✅ Database "${targetDb}" recreated cleanly.`);
  } catch (err: any) {
    console.error(`❌ Failed to reset database: ${err.message}`);
    process.exit(1);
  } finally {
    await sqlAdmin.end();
  }

  console.log(`📦 Enabling vector extension on "${targetDb}"...`);
  const sqlTarget = postgres(dbUrl!);
  try {
    await sqlTarget.unsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log(`✅ Vector extension enabled successfully.`);
  } catch (err: any) {
    console.error(`❌ Failed to enable vector extension: ${err.message}`);
    process.exit(1);
  } finally {
    await sqlTarget.end();
  }

  console.log(`🎉 Database reset complete! Ready for migrations and seeding.`);
}

main();
