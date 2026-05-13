import { createLogger } from '../../shared/logger.js';
import type { AppointmentRepository } from '../../domains/appointment/ports/appointment.repository.js';
import type { PatientRepository } from '../../domains/patient/ports/patient.repository.js';
import type { SendSmsUseCase } from '../../domains/communication/use-cases/send-sms.use-case.js';
import { SyncTemplatesUseCase } from '../../domains/whatsapp/use-cases/sync-templates.use-case.js';
import type { WhatsAppRepository } from '../../domains/whatsapp/ports/whatsapp.repository.js';
import type { WhatsAppGateway } from '../../domains/whatsapp/ports/whatsapp-gateway.js';

const logger = createLogger('job-scheduler');

export class JobScheduler {
  private intervals: NodeJS.Timeout[] = [];
  private lastBirthdayRunDate: string | null = null;

  constructor(
    private readonly appointmentRepo: AppointmentRepository,
    private readonly patientRepo: PatientRepository,
    private readonly smsUseCase: SendSmsUseCase,
    private readonly waRepo?: WhatsAppRepository,
    private readonly waGateway?: WhatsAppGateway,
  ) { }

  public start() {
    logger.info('Starting internal job scheduler...');

    // 1. Appointment Reminders (Every hour)
    this.intervals.push(setInterval(() => this.runAppointmentReminders(), 60 * 60 * 1000));

    // 2. Birthday Greetings (Every hour, but logic checks once per day)
    this.intervals.push(setInterval(() => this.runBirthdayGreetings(), 60 * 60 * 1000));

    // 3. WhatsApp Template Sync (Every 6 hours)
    if (this.waRepo && this.waGateway) {
      this.intervals.push(setInterval(() => this.runTemplateSyncAll(), 6 * 60 * 60 * 1000));
    }

    // Initial runs
    this.runAppointmentReminders();
    this.runBirthdayGreetings();
  }

  public stop() {
    this.intervals.forEach(clearInterval);
  }

  private async runAppointmentReminders() {
    try {
      logger.info('[Job] Running Appointment Reminders...');
      const now = new Date();
      const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
      const istDate = new Date(istString);
      
      // Calculate tomorrow in IST
      const tomorrow = new Date(istDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const y = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      const dateStr = `${y}-${mm}-${dd}`;

      // Assuming findMany is available on repo. 
      // For now, let's use the execute method pattern if available.
      // We'll peek at the appointments for tomorrow.
      const res = await this.appointmentRepo.findMany({
        date: dateStr,
        page: 1,
        limit: 100,
        status: 'Scheduled'
      });

      for (const appt of res.data) {
        if (appt.phone && appt.patientName) {
          // DECOMMISSIONED: SMS session moved to WhatsApp
          /*
          await this.smsUseCase.sendAppointmentReminder({
            phone: appt.phone,
            patientName: appt.patientName,
            date: dateStr || '',
            time: appt.bookingTime || '',
            clinicName: 'Kreed.health Clinic'
          });
          */
          logger.info(`[Job] Reminder (SMS) skipped for ${appt.patientName} (${appt.phone}) — decommissioning in progress`);
        }
      }
    } catch (err: any) {
      logger.error(`[Job] Appointment Reminder error: ${err.message}`);
    }
  }

  private async runBirthdayGreetings() {
    try {
      const now = new Date();
      const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
      const istDate = new Date(istString);
      
      const y = istDate.getFullYear();
      const mm = String(istDate.getMonth() + 1).padStart(2, '0');
      const dd = String(istDate.getDate()).padStart(2, '0');
      
      const todayStr = `${y}-${mm}-${dd}`;
      const mmdd = `${mm}-${dd}`; // "MM-DD"
      const currentHour = istDate.getHours();

      // Only run between 9 AM and 10 AM IST
      if (currentHour < 9 || currentHour >= 10) return;
      if (this.lastBirthdayRunDate === todayStr) return;

      logger.info(`[Job] Running Birthday Greetings for ${mmdd}...`);

      const patients = await this.patientRepo.findBirthdays(mmdd);

      for (const p of patients) {
        if (p.phone && p.fullName) {
          // DECOMMISSIONED: SMS session moved to WhatsApp
          /*
          await this.smsUseCase.sendBirthdayGreeting({
            phone: p.phone,
            patientName: p.fullName
          });
          */
          logger.info(`[Job] Birthday greeting (SMS) skipped for ${p.fullName} (${p.phone}) — decommissioning in progress`);
        }
      }

      if (todayStr) {
        this.lastBirthdayRunDate = todayStr;
      }
      logger.info(`[Job] Birthday Greetings job completed for ${patients.length} patients.`);
    } catch (err: any) {
      logger.error(`[Job] Birthday Greeting error: ${err.message}`);
    }
  }

  private async runTemplateSyncAll() {
    if (!this.waRepo || !this.waGateway) return;
    try {
      logger.info('[Job] Running WhatsApp Template Sync...');
      const channels = await this.waRepo.listChannels();
      const activeChannels = channels.filter((c: any) => c.isActive !== false);

      if (activeChannels.length === 0) {
        logger.info('[Job] No active WhatsApp channels found — skipping template sync.');
        return;
      }

      const syncUseCase = new SyncTemplatesUseCase(this.waGateway, this.waRepo);

      for (const channel of activeChannels) {
        try {
          const result = await syncUseCase.execute(channel.id);
          logger.info(
            `[Job] Template sync for "${channel.name}": ` +
            `${result.created} new, ${result.updated} updated, ${result.unchanged} unchanged`
          );
        } catch (err: any) {
          logger.warn(`[Job] Template sync failed for channel ${channel.id}: ${err.message}`);
        }
      }

      logger.info(`[Job] Template sync completed for ${activeChannels.length} channel(s).`);
    } catch (err: any) {
      logger.error(`[Job] Template sync error: ${err.message}`);
    }
  }
}
