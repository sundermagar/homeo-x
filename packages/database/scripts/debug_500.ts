import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';
import { PaymentRepositoryPg } from '../../../apps/api/src/infrastructure/repositories/payment.repository.pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../../.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("No DATABASE_URL");
  process.exit(1);
}

// Test with 'tenant_demo'
const sql = postgres(connectionString, {
  connection: { search_path: 'tenant_demo' }
});

const db = drizzle(sql, { schema });
const repo = new PaymentRepositoryPg(db as any);

async function test() {
  console.log("Testing PaymentRepository.findAll()...");
  try {
    const result = await repo.findAll({ page: 1, limit: 10 });
    console.log("SUCCESS:", result.data.length, "records found.");
  } catch (err: any) {
    console.error("FAILED with error:");
    console.error(err);
    if (err.message) console.error("Message:", err.message);
    if (err.detail) console.error("Detail:", err.detail);
    if (err.hint) console.error("Hint:", err.hint);
  } finally {
    await sql.end();
  }
}

test();
