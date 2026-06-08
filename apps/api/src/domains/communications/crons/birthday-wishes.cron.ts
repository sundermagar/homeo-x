import { createDbClient } from '@mmc/database';
import * as schema from '@mmc/database/schema';
import { sql } from 'drizzle-orm';
import { createLogger } from '../../../shared/logger.js';

const logger = createLogger('birthday-cron');

export function initBirthdayWishesCron(dbUrl: string) {
  const MS_IN_HOUR = 60 * 60 * 1000;

  async function checkBirthdays() {
    logger.info('Running daily birthday wishes check');

    try {
      const db = createDbClient(dbUrl);

      const today = new Date();
      const month = today.getMonth() + 1;
      const day = today.getDate();

      // Query caseDatas for patients whose dob matches today's day & month
      const patients = await db
        .select({
          regid: schema.patientsLegacy.regid,
          firstName: schema.patientsLegacy.firstName,
          phone: schema.patientsLegacy.phone,
        })
        .from(schema.patientsLegacy)
        .where(
          sql`EXTRACT(MONTH FROM ${schema.patientsLegacy.dob}) = ${month} AND EXTRACT(DAY FROM ${schema.patientsLegacy.dob}) = ${day}`,
        );

      logger.info(`Found ${patients.length} patients with birthdays today.`);

      // TODO: Once WhatsApp template 'birthday_wish' is registered, loop
      // through `patients` and send via WhatsAppCloudGateway.sendTemplate().
      // For now we just log so the cron doesn't crash the server.
      for (const p of patients) {
        logger.info(`🎂 Happy Birthday ${p.firstName} (regid=${p.regid}, phone=${p.phone})`);
      }
    } catch (error: any) {
      logger.error(`Error in birthday cron: ${error.message}`);
    }
  }

  // Check every 6 hours
  setInterval(checkBirthdays, 6 * MS_IN_HOUR);
  logger.info('Birthday wishes cron initialized (checks every 6 hours)');
}
