import { migrateTenant } from "./src/migrate-tenant.js";

async function main() {
  const dbUrl = "postgresql://postgres:kUaJUiAKeechYXrdvXJObGHNMRDNUusL@shinkansen.proxy.rlwy.net:26313/railway";
  try {
    await migrateTenant(dbUrl, "tenant_hypeclinic");
    console.log("Migration successful for tenant_hypeclinic!");
  } catch (err: any) {
    console.error("Migration failed:", err.message);
  }
  process.exit(0);
}
main();
