import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/legacy/index.ts',
  out: './src/migrations/legacy',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/homeo_x',
  },
});

