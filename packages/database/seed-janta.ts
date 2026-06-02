import { createDbClient } from "./src/client.js";
import { seedRbac } from "./src/seeds/rbac-seed.js";

async function main() {
  const dbUrl = "postgresql://postgres:kUaJUiAKeechYXrdvXJObGHNMRDNUusL@shinkansen.proxy.rlwy.net:26313/railway";
  const db = createDbClient(dbUrl, "tenant_jantaclinic");
  await seedRbac(db);
  console.log("Done seeding janta clinic");
  process.exit(0);
}
main().catch(console.error);
