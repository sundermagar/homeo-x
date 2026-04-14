import { createDbClient } from '../../src/client';
import { seedTestData } from '../../src/seeds/test-data-seed';

async function main() {
  try {
    const dbUrl = 'postgresql://postgres:instep123@localhost:5432/homeo_x';
    const db = createDbClient(dbUrl, 'tenant_demo');
    await seedTestData(db);
    console.log("Success");
  } catch (err) {
    console.error("FAIL:", err);
  }
}

main().catch(console.error);
