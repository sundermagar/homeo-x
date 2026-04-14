import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';
import { PaymentRepositoryPg } from '../../../apps/api/src/infrastructure/repositories/payment.repository.pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../../.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  process.exit(1);
}

const sql = postgres(connectionString);
const db = drizzle(sql, { schema });
const repo = new PaymentRepositoryPg(db as any);

async function test() {
  const query = db
    .select({
      payment: schema.payments,
      patientName: sql`CONCAT(${schema.patients.firstName}, ' ', ${schema.patients.surname})`,
      phone: schema.patients.mobile1,
    })
    .from(schema.payments)
    .leftJoin(schema.patients, sql`${schema.patients.regid} = ${schema.payments.regid}`)
    .where(sql`${schema.payments.deletedAt} IS NULL`)
    .limit(10);
    
  console.log("SQL:");
  console.log(query.toSQL());
  await sql.end();
}

test();
