import type { 
  IDashboardRepository 
} from '../ports/dashboard.repository';
import type { 
  UnifiedDashboardData, 
  Result 
} from '@mmc/types';

export class DashboardUseCases {
  constructor(private readonly repository: IDashboardRepository) {}

  async getUnifiedDashboard(
    period: string, 
    contextId: number, 
    user: { type: string; contextId: number; id: number }
  ): Promise<Result<UnifiedDashboardData>> {
    try {
      const isDoctor = user.type.toLowerCase() === 'doctor';
      const doctorId = isDoctor ? user.id : undefined;

      const [
        kpis,
        queue,
        activity,
        reminders,
        birthdays,
        revenueSeries
      ] = await Promise.all([
        this.repository.getKpis(period, contextId, doctorId),
        this.repository.getTodayQueue(contextId, doctorId),
        this.repository.getRecentActivity(contextId, 10),
        this.repository.getPendingReminders(contextId, 5),
        this.repository.getBirthdays(contextId),
        this.repository.getRevenueSeries(period, contextId)
      ]);

      return {
        success: true,
        data: {
          kpis,
          queue,
          activity,
          reminders,
          birthdays,
          revenueSeries,
          clinicName: 'Clinical Dashboard'
        }
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async markReminderDone(id: number): Promise<Result<void>> {
    try {
      await this.repository.markReminderDone(id);
      return { success: true, data: undefined };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
