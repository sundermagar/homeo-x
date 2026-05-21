import type {
  IDashboardRepository
} from '../ports/dashboard.repository.js';
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
    const safe = async <T>(fn: () => Promise<T>, label: string, fallback: T): Promise<T> => {
      const start = Date.now();
      try {
        const out = await fn();
        const ms = Date.now() - start;
        if (ms > 500) console.warn(`[Dashboard] ${label} took ${ms}ms`);
        return out;
      } catch (err: any) {
        console.error(`[Dashboard] ${label} failed:`, err?.message);
        return fallback;
      }
    };

    try {
      const isAdmin = ['superadmin', 'admin', 'clinicadmin'].includes((user.type || '').toLowerCase());
      const isDoctor = !isAdmin && (user.type || '').toLowerCase() === 'doctor';
      // Appointments store the legacy doctors.id, which doesn't always match the logged-in users.id.
      // Resolve to the correct id so queries return real data instead of empty results.
      const doctorId = isDoctor
        ? (this.repository.resolveDoctorIdForUser
            ? await this.repository.resolveDoctorIdForUser(user.id)
            : user.id)
        : undefined;

      const parallelStart = Date.now();
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
        safe(() => this.repository.getKpis(period, contextId, doctorId), 'getKpis', {
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
          casesCount: 0,
          casesTrend: 0,
        }),
        safe(() => this.repository.getTodayQueue(contextId, doctorId), 'getTodayQueue', []),
        safe(() => this.repository.getRecentActivity(contextId, 10), 'getRecentActivity', []),
        safe(() => this.repository.getPendingReminders(contextId, 5), 'getPendingReminders', []),
        safe(() => this.repository.getBirthdays(contextId), 'getBirthdays', []),
        safe(() => this.repository.getRevenueSeries(period, contextId), 'getRevenueSeries', []),
        (['superadmin', 'admin'].includes(user.type.toLowerCase()))
          ? safe(() => this.repository.getPlatformStats(), 'getPlatformStats', undefined)
          : Promise.resolve(undefined),
        safe(() => this.repository.getRecentTransactions(5, contextId), 'getRecentTransactions', []),
      ]);
      console.log(`[Dashboard] all parallel queries finished in ${Date.now() - parallelStart}ms`);

      const intelligenceInsights = await safe(
        () => this.repository.getIntelligenceInsights(kpis),
        'getIntelligenceInsights',
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
      const safe = async <T>(fn: () => Promise<T>, label: string, fallback: T): Promise<T> => {
        const start = Date.now();
        try {
          const out = await fn();
          const ms = Date.now() - start;
          if (ms > 300) console.warn(`[ClinicAdmin] ${label} took ${ms}ms`);
          return out;
        } catch (err: any) {
          console.error(`[ClinicAdmin] ${label} failed:`, err?.message);
          return fallback;
        }
      };

      const parallelStart = Date.now();
      const [kpis, revenueBreakdown, topBilling, targets, staffOnDuty, recentActivity, queue, multiSeries] =
        await Promise.all([
          safe(() => this.repository.getKpis(period, contextId), 'getKpis', {
            newPatientsCount: 0, followUpsCount: 0, todaysCollection: 0,
            todaysExpenses: 0, revenueTrend: 0, patientTrend: 0,
            collectionRate: 0, collectionRateTrend: 0,
            avgWaitTime: 0, avgWaitTimeTrend: 0,
            casesCount: 0, casesTrend: 0,
          }),
          safe(() => this.repository.getRevenueBreakdown(period, contextId), 'getRevenueBreakdown', {
            physicalCurrency: 0, physicalCurrencyPct: 0, upiCard: 0,
            upiCardPct: 0, pending: 0, pendingCount: 0, perPatient: 0,
          }),
          safe(() => this.repository.getTopBilling(period, 5, contextId), 'getTopBilling', []),
          safe(() => this.repository.getMonthlyTargets(period, contextId), 'getMonthlyTargets', []),
          safe(() => this.repository.getStaffOnDuty(contextId), 'getStaffOnDuty', []),
          safe(() => this.repository.getRecentActivity(contextId, 5), 'getRecentActivity', []),
          safe(() => this.repository.getTodayQueue(contextId), 'getTodayQueue', []),
          safe(() => this.repository.getMultiRevenueSeries(period, contextId), 'getMultiRevenueSeries', { total: [], cash: [], upi: [] }),
        ]);
      console.log(`[ClinicAdmin] all parallel queries finished in ${Date.now() - parallelStart}ms`);
 
      const { total: revenueSeries, cash: cashSeries, upi: upiSeries } = multiSeries;
 
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
