import type {
  IDashboardRepository
} from '../ports/dashboard.repository';
import type {
  UnifiedDashboardData,
  ClinicAdminDashboardData,
} from '@mmc/types';
import { type Result } from '../../../shared/result.js';

export class DashboardUseCases {
  constructor(private readonly repository: IDashboardRepository) {}

  async getUnifiedDashboard(
    period: string,
    contextId: number,
    user: { type: string; contextId: number; id: number }
  ): Promise<Result<UnifiedDashboardData>> {
    const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try {
        return await fn();
      } catch {
        return fallback;
      }
    };

    try {
      console.log(`[Dashboard] Checking isDoctor. User payload:`, user);
      const isDoctor = (user.type || '').toLowerCase() === 'doctor';
      const doctorId = isDoctor ? user.id : undefined;

      const [
        kpis,
        queue,
        activity,
        reminders,
        birthdays,
        revenueSeries,
        platformStats,
        recentTransactions,
      ] = await Promise.all([
        safe(this.repository.getKpis.bind(this.repository, period, contextId, doctorId), {
          newPatientsCount: 0,
          followUpsCount: 0,
          todaysCollection: 0,
          todaysExpenses: 0,
          revenueTrend: 0,
          patientTrend: 0,
          collectionRate: 0,
          collectionRateTrend: 0,
          avgWaitTime: 0,
          avgWaitTimeTrend: 0,
        }),
        safe(this.repository.getTodayQueue.bind(this.repository, contextId, doctorId), []),
        safe(this.repository.getRecentActivity.bind(this.repository, contextId, 10), []),
        safe(this.repository.getPendingReminders.bind(this.repository, contextId, 5), []),
        safe(this.repository.getBirthdays.bind(this.repository, contextId), []),
        safe(this.repository.getRevenueSeries.bind(this.repository, period, contextId), []),
        (['superadmin', 'admin'].includes(user.type.toLowerCase()))
          ? safe(this.repository.getPlatformStats.bind(this.repository), undefined)
          : Promise.resolve(undefined),
        safe(this.repository.getRecentTransactions.bind(this.repository, 5), []),
      ]);

      const intelligenceInsights = await safe(
        this.repository.getIntelligenceInsights.bind(this.repository, kpis),
        [{ color: '#22c55e', text: 'Clinic is running smoothly.' }]
      );
 
      return {
        success: true,
        data: {
          kpis,
          queue,
          activity,
          reminders,
          birthdays,
          revenueSeries,
          clinicName: 'Clinical Dashboard',
          platformStats,
          recentTransactions,
          intelligenceInsights,
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

  async getClinicAdminDashboard(
    period: string,
    contextId: number
  ): Promise<Result<ClinicAdminDashboardData>> {
    try {
      const safe = <T>(fn: () => Promise<T>, fallback: T) =>
        fn().catch(() => fallback);
 
      const [kpis, revenueBreakdown, topBilling, targets, staffOnDuty, recentActivity, queue, revenueSeries, cashSeries, upiSeries] =
        await Promise.all([
          safe(() => this.repository.getKpis(period, contextId), {
            newPatientsCount: 0, followUpsCount: 0, todaysCollection: 0,
            todaysExpenses: 0, revenueTrend: 0, patientTrend: 0,
            collectionRate: 0, collectionRateTrend: 0,
            avgWaitTime: 0, avgWaitTimeTrend: 0,
          }),
          safe(() => this.repository.getRevenueBreakdown(period, contextId), {
            physicalCurrency: 0, physicalCurrencyPct: 0, upiCard: 0,
            upiCardPct: 0, pending: 0, pendingCount: 0, perPatient: 0,
          }),
          safe(() => this.repository.getTopBilling(period, 5, contextId), []),
          safe(() => this.repository.getMonthlyTargets(period, contextId), []),
          safe(() => this.repository.getStaffOnDuty(contextId), []),
          safe(() => this.repository.getRecentActivity(contextId, 5), []),
          safe(() => this.repository.getTodayQueue(contextId), []),
          safe(() => this.repository.getRevenueSeries(period, contextId), []),
          safe(() => this.repository.getRevenueSeries(period, contextId, 'Cash'), []),
          safe(() => this.repository.getRevenueSeries(period, contextId, 'UPI/Card'), []),
        ]);
 
      const now = new Date();
      let weekLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      if (period === 'year') weekLabel = `Year ${now.getFullYear()}`;
      if (period === 'day') weekLabel = `Today, ${now.toLocaleDateString()}`;
      if (period === 'week') {
        const weekNum = Math.ceil((now.getDate()) / 7);
        weekLabel = `${now.toLocaleString('default', { month: 'long' })} · Week ${weekNum}`;
      }
 
      return {
        success: true,
        data: {
          totalRevenue: kpis.todaysCollection,
          revenueTrend: Number(kpis.revenueTrend) || 0,
          patientsCount: kpis.newPatientsCount,
          patientsTrend: Number(kpis.patientTrend) || 0,
          collectionRate: kpis.collectionRate,
          collectionRateTrend: Number(kpis.collectionRateTrend) || 0,
          avgWaitTime: kpis.avgWaitTime,
          avgWaitTimeTrend: Number(kpis.avgWaitTimeTrend) || 0,
          revenueBreakdown,
          revenueSeries,
          cashSeries,
          upiSeries,
          targets,
          topBilling,
          recentActivity,
          queue,
          staffOnDuty,
          weekLabel,
        }
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
