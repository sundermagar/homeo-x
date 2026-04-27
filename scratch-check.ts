import { TenantRegistry, createDbClient } from '@mmc/database';
import { sql } from 'drizzle-orm';

async function main() {
  const defaultTenant = TenantRegistry.resolve('demo') || { schemaName: 'public' };
  const tenantDb = createDbClient(process.env.DATABASE_URL!, (defaultTenant as any).schemaName);
  const res = await tenantDb.execute(sql`SELECT * FROM expenseshead`);
  console.log("expenseshead:", res);
}
main().catch(console.error);
