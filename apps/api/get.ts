import { db } from './src/infrastructure/database/client';
import { caseDatasLegacy } from '@mmc/database/schema';
import { isNotNull, or } from 'drizzle-orm';

async function main() {
  try {
    const patient = await db.query.caseDatasLegacy.findFirst({
      where: or(isNotNull(caseDatasLegacy.mobile1), isNotNull(caseDatasLegacy.phone))
    });
    console.log("PHONE_FOUND=" + (patient?.mobile1 || patient?.phone || "NONE"));
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
main();
