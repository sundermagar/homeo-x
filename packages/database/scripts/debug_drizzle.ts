import { drizzle } from 'drizzle-orm/postgres-js';
import { sql, eq, isNull } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from './schema/index';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../../.env') });

const postgresClient = postgres(process.env.DATABASE_URL!);
const db = drizzle(postgresClient, { schema });

async function test() {
  console.log("Extracting SQL for findAll()...");
  try {
    const page = 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const query = db
      .select({
        payment: schema.payments,
        patientName: sql<string>`CONCAT(${schema.patients.firstName}, ' ', ${schema.patients.surname})`,
        phone: schema.patients.mobile1,
      })
      .from(schema.payments)
      .leftJoin(schema.patients, eq(schema.patients.regid, schema.payments.regid))
      .where(isNull(schema.payments.deletedAt))
      .orderBy(sql`${schema.payments.id} DESC`)
      .limit(limit)
      .offset(offset);

    console.log("SQL generated!");
    console.log(query.toSQL());

    // Actually execute it
    await query;
    console.log("Query executed successfully!");
  } catch (err: any) {
    console.error("FAILED with error:");
    console.error(err);
    if (err.message) console.error("Message:", err.message);
  } finally {
    await postgresClient.end();
  }
}

test();
