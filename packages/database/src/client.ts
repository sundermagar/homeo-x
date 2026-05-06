import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

export type DbClient = ReturnType<typeof drizzle<typeof schema>>;

const clients = new Map<string, DbClient>();

/**
 * Schema-per-tenant: each tenant gets its own PostgreSQL schema.
 * The connection pool is shared, but each query runs in the tenant's schema.
 */
export function createDbClient(databaseUrl: string, tenantSchema?: string): DbClient {
  const cacheKey = `${databaseUrl}:${tenantSchema || 'public'}`;

  if (clients.has(cacheKey)) {
    return clients.get(cacheKey)!;
  }

  console.log(`🔌 Creating new DB client for schema: [${tenantSchema || 'public'}]`);

  const connectionOptions: Record<string, any> = {
    max: Number(process.env['DB_MAX_CONNECTIONS'] || 25),
    idle_timeout: Number(process.env['DB_IDLE_TIMEOUT'] || 30),
    connect_timeout: Number(process.env['DB_CONNECT_TIMEOUT'] || 15),
  };

  let finalUrl = databaseUrl;
  if (tenantSchema) {
    // IMPORTANT: Only set the tenant schema in search_path — do NOT include 'public'.
    // Including 'public' causes cross-tenant data leakage: when a table doesn't exist
    // or is empty in the tenant schema, PostgreSQL falls through to public schema
    // which contains data from other tenants (e.g. tenant_demo).
    // Any queries needing public schema data (organizations, etc.) should use
    // explicit 'public.' prefix or the dedicated publicDb client.
    const separator = finalUrl.includes('?') ? '&' : '?';
    finalUrl += `${separator}options=-c%20search_path%3D${tenantSchema}`;
  }

  const sql = postgres(finalUrl, connectionOptions);
  const db = drizzle(sql, { schema });

  // Attach raw postgres-js client as an escape hatch for raw string queries
  (db as any).rawClient = sql;

  clients.set(cacheKey, db);
  return db;
}
