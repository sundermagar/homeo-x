import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

export type DbClient = ReturnType<typeof drizzle<typeof schema>>;

const clients = new Map<string, DbClient>();
const rawClients: Array<ReturnType<typeof postgres>> = [];

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

  // Pool tuning — TLDR:
  //   max=10           → safe under Railway free-tier connection caps with 2 pools (public + tenant).
  //   idle_timeout=300 → 5 min, so a single user's think-time doesn't drop connections.
  //                      Earlier 30 s killed connections constantly; each new request paid a
  //                      ~3.4 s TCP+TLS+auth handshake to the remote DB.
  //   max_lifetime=1800 → recycle every 30 min to dodge cloud LB connection drops.
  //   connect_timeout=15s for slow handshakes on cold infra.
  const connectionOptions: Record<string, any> = {
    max: Number(process.env['DB_MAX_CONNECTIONS'] || 10),
    idle_timeout: Number(process.env['DB_IDLE_TIMEOUT'] || 300),
    max_lifetime: Number(process.env['DB_MAX_LIFETIME'] || 1800),
    connect_timeout: Number(process.env['DB_CONNECT_TIMEOUT'] || 15),
    keep_alive: 60,
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
  rawClients.push(sql);

  clients.set(cacheKey, db);
  return db;
}

/**
 * Pre-spawn a couple of pool connections so the first user request doesn't pay
 * the ~3 s cold-start handshake on a remote DB (Railway, Supabase, etc.).
 * Call once at app startup, after createDbClient(...) has registered the pools.
 *
 * Also runs a tiny keep-alive ping every 4 min to prevent the remote LB from
 * silently dropping idle connections, which would re-introduce cold-start cost.
 */
let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
export async function warmDbPools(): Promise<void> {
  if (rawClients.length === 0) return;
  // Two SELECT 1's per pool establishes a couple of live connections.
  await Promise.all(
    rawClients.flatMap(sql => [sql`SELECT 1`.catch(() => {}), sql`SELECT 1`.catch(() => {})]),
  );

  if (keepAliveTimer) return;
  keepAliveTimer = setInterval(() => {
    for (const sql of rawClients) {
      sql`SELECT 1`.catch(() => {});
    }
  }, 4 * 60_000);
  if (typeof keepAliveTimer.unref === 'function') keepAliveTimer.unref();
}
