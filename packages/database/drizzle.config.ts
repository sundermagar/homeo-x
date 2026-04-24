import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';
import path from 'node:path';

// process.cwd() = packages/database when running via drizzle-kit
// so ../../.env resolves to the monorepo root .env
config({ path: path.resolve(process.cwd(), '../../.env') });

export default defineConfig({
  schema: './src/schema/app-schema.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Fallback to friend's local DB if env not set
    url: process.env.DATABASE_URL || 'postgresql://postgres:instep123@localhost:5432/homeo_x',
  },
});
