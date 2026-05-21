import type {
  DashboardKpis,
  QueueItem,
  ActivityItem,
  SimpleReminder,
  BirthdayPatient,
  RevenueSeries,
  RevenueBreakdown,
  TopBillingItem,
  MonthlyTarget,
  PlatformStats,
  RecentTransaction,
  IntelligenceInsight,
} from '@mmc/types';

export interface IDashboardRepository {
  getKpis(period: string, contextId: number, doctorId?: number): Promise<DashboardKpis>;
  getTodayQueue(contextId: number, doctorId?: number): Promise<QueueItem[]>;
  getRecentActivity(contextId: number, limit: number): Promise<ActivityItem[]>;
  getPendingReminders(contextId: number, limit: number): Promise<SimpleReminder[]>;
  getBirthdays(contextId: number): Promise<BirthdayPatient[]>;
  getRevenueSeries(period: string, contextId: number, paymentMode?: string): Promise<RevenueSeries[]>;
  getMultiRevenueSeries(period: string, contextId: number): Promise<{ total: RevenueSeries[]; cash: RevenueSeries[]; upi: RevenueSeries[] }>;
  markReminderDone(id: number): Promise<void>;
  getRecentTransactions(limit: number, contextId?: number): Promise<RecentTransaction[]>;
  getIntelligenceInsights(kpis: DashboardKpis): Promise<IntelligenceInsight[]>;
  // Clinic Admin specific
  getRevenueBreakdown(period: string, contextId: number): Promise<RevenueBreakdown>;
  getTopBilling(period: string, limit: number, contextId: number): Promise<TopBillingItem[]>;
  getMonthlyTargets(period: string, contextId: number): Promise<MonthlyTarget[]>;
  getStaffOnDuty(contextId: number): Promise<{ name: string; role: string; count?: number }[]>;
  getPlatformStats(): Promise<PlatformStats>;
  /**
   * Maps a logged-in `users.id` (Doctor type) to the `doctors.id` recorded on appointments.
   * For modern doctors these are equal; for legacy data they can diverge — match by email.
   * Returns the input id when no override is needed (so callers can pass through safely).
   */
  resolveDoctorIdForUser?(userId: number): Promise<number>;
}
