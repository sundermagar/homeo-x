import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import path from 'path';
import { fileURLToPath } from 'url';

import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function migrateTenant(dbUrl: string, schemaName: string): Promise<void> {
  let migrationsFolder = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsFolder)) {
    migrationsFolder = path.join(__dirname, '../src/migrations');
  }

  const dbConnection = postgres(dbUrl, {
    max: 1,
    onnotice: () => {},
    connection: {
      search_path: `${schemaName},public`
    }
  });

  try {
    const db = drizzle(dbConnection);
    await migrate(db, {
      migrationsFolder,
      migrationsSchema: schemaName,
      migrationsTable: '__drizzle_migrations',
    });
  } finally {
    await dbConnection.end();
  }
}
