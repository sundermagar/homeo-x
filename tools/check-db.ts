
import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, integer, text, timestamp } from 'drizzle-orm/pg-core';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from root
dotenv.config({ path: path.join(process.cwd(), '.env') });

const doctorsLegacy = pgTable("doctors", {
  id: integer("id").notNull(),
  name: text("name").notNull(),
  deletedAt: timestamp("deleted_at"),
});

async function checkDoctors() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Set search path to tenant_demo
    await client.query('SET search_path TO tenant_demo');
    console.log('Switched to schema: tenant_demo');

    const res = await client.query('SELECT id, name, deleted_at FROM doctors LIMIT 5');
    console.log(`Found ${res.rowCount} doctors in tenant_demo.doctors table:`);
    res.rows.forEach(row => {
      console.log(`- ID: ${row.id}, Name: ${row.name}, DeletedAt: ${row.deleted_at}`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkDoctors();
