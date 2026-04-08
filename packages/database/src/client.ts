import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

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

  const connectionOptions: postgres.Options<Record<string, unknown>> = {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  };

  // Set search_path to tenant schema if provided
  if (tenantSchema) {
    connectionOptions.connection = {
      search_path: tenantSchema,
    };
  }

  const sql = postgres(databaseUrl, connectionOptions);
  const db = drizzle(sql, { schema });

  clients.set(cacheKey, db);
  return db;
}
