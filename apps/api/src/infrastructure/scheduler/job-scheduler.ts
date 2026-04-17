import { createLogger } from '../../shared/logger';
import type { AppointmentRepository } from '../../domains/appointment/ports/appointment.repository';
import type { PatientRepository } from '../../domains/patient/ports/patient.repository';
import type { SendSmsUseCase } from '../../domains/communication/use-cases/send-sms.use-case';

const logger = createLogger('job-scheduler');

export class JobScheduler {
  private intervals: NodeJS.Timeout[] = [];
  private lastBirthdayRunDate: string | null = null;

  constructor(
    private readonly appointmentRepo: AppointmentRepository,
    private readonly patientRepo: PatientRepository,
    private readonly smsUseCase: SendSmsUseCase
  ) { }

  public start() {
    logger.info('Starting internal job scheduler...');

    // 1. Appointment Reminders (Every hour)
    this.intervals.push(setInterval(() => this.runAppointmentReminders(), 60 * 60 * 1000));

    // 2. Birthday Greetings (Every hour, but logic checks once per day)
    this.intervals.push(setInterval(() => this.runBirthdayGreetings(), 60 * 60 * 1000));

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
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

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
          await this.smsUseCase.sendAppointmentReminder({
            phone: appt.phone,
            patientName: appt.patientName,
            date: dateStr || '',
            time: appt.bookingTime || '',
            clinicName: 'HomeoX Clinic'
          });
          logger.info(`[Job] Reminder sent to ${appt.patientName} (${appt.phone})`);
        }
      }
    } catch (err: any) {
      logger.error(`[Job] Appointment Reminder error: ${err.message}`);
    }
  }

  private async runBirthdayGreetings() {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0] || '';
      const mmdd = todayStr.substring(5, 10); // "MM-DD"
      const currentHour = today.getHours();

      // Only run between 9 AM and 10 AM
      if (currentHour < 9 || currentHour >= 10) return;
      if (this.lastBirthdayRunDate === todayStr) return;

      logger.info(`[Job] Running Birthday Greetings for ${mmdd}...`);

      const patients = await this.patientRepo.findBirthdays(mmdd);

      for (const p of patients) {
        if (p.phone && p.fullName) {
          await this.smsUseCase.sendBirthdayGreeting({
            phone: p.phone,
            patientName: p.fullName
          });
          logger.info(`[Job] Birthday greeting sent to ${p.fullName} (${p.phone})`);
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
}
