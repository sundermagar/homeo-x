import { createDbClient } from '@mmc/database';
import * as schema from '@mmc/database/schema';
import { sql, eq, and, desc, gte } from 'drizzle-orm';
import { createLogger } from '../../../shared/logger.js';
import { SendWhatsAppTemplateUseCase } from '../../communication/use-cases/send-whatsapp-template.use-case.js';
import { WhatsAppRepositoryPG } from '../../../infrastructure/repositories/whatsapp.repository.pg.js';
import { WhatsAppCloudGateway } from '../../../infrastructure/communication/whatsapp-cloud-gateway.js';
import cron from 'node-cron';

const logger = createLogger('medicine-reminder-cron');

export function initMedicineReminderCron(dbUrl: string) {
  async function runDailyMedicineReminders() {
    logger.info('Starting daily medicine reminders cron job');

    try {
      const db = createDbClient(dbUrl);

      // We need a repository and gateway to send WhatsApp messages
      const waRepo = new WhatsAppRepositoryPG(db as any);
      const waGateway = new WhatsAppCloudGateway(waRepo);
      const waUseCase = new SendWhatsAppTemplateUseCase(waGateway, waRepo);

      // We consider a prescription "active" if it was given in the last 15 days 
      // (This is a simplified heuristic. In a full system, you would check `days` prescribed)
      const thirtyDaysAgoDate = new Date();
      thirtyDaysAgoDate.setDate(thirtyDaysAgoDate.getDate() - 15);
      
      const thirtyDaysAgoStr = thirtyDaysAgoDate.toISOString().split('T')[0] || '';

      // Get all prescriptions from the last 15 days
      const recentPrescriptions = await db
        .select({
          regid: schema.legacyPrescriptions.regid,
          remedy: schema.legacyPrescriptions.rxremedy,
          instructions: schema.legacyPrescriptions.rxprescription,
          dateval: schema.legacyPrescriptions.dateval,
        })
        .from(schema.legacyPrescriptions)
        .where(gte(schema.legacyPrescriptions.dateval, thirtyDaysAgoStr))
        .orderBy(desc(schema.legacyPrescriptions.dateval));

      // Group by patient
      const patientPrescriptions = new Map<number, string[]>();
      for (const rx of recentPrescriptions) {
        if (!rx.regid || !rx.remedy) continue;
        const meds = patientPrescriptions.get(rx.regid) || [];
        // prevent duplicates
        const formattedMed = rx.remedy;
        if (!meds.includes(formattedMed)) {
          meds.push(formattedMed);
          patientPrescriptions.set(rx.regid, meds);
        }
      }

      logger.info(`Found ${patientPrescriptions.size} patients with active prescriptions.`);

      // Send reminders
      for (const [regid, medicines] of patientPrescriptions.entries()) {
        const patients = await db
          .select({
            firstName: schema.patientsLegacy.firstName,
            phone: schema.patientsLegacy.phone,
          })
          .from(schema.patientsLegacy)
          .where(eq(schema.patientsLegacy.regid, regid))
          .limit(1);

        if (patients.length > 0) {
          const patient = patients[0];
          
          if (patient && patient.phone) {
            await waUseCase.sendMedicineReminder({
              clinicId: 1, // Default clinic ID
              phone: patient.phone,
              patientName: patient.firstName || 'Patient',
              medicines,
              clinicName: 'MMC Clinic'
            });

            logger.info(`Sent medicine reminder to ${patient.firstName} (regid=${regid})`);
          }
        }
      }
    } catch (error: any) {
      logger.error(`Error in medicine reminder cron: ${error.message}`);
    }
  }

  // Schedule the job to run every day at 08:00 AM
  // Format: second(optional) minute hour dayOfMonth month dayOfWeek
  cron.schedule('0 8 * * *', () => {
    runDailyMedicineReminders();
  });

  logger.info('Medicine reminders cron initialized (scheduled for 08:00 AM daily)');
}
