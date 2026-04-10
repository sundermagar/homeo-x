import type {
  AnalyticsSummary,
  PatientTrendResult,
  MonthWiseResult,
  MonthWiseDueSummary,
  MonthWiseDueDetail,
  BirthdayPatient,
  ReferenceListResult
} from '@mmc/types';

export interface IAnalyticsRepository {
  /**
   * Get top-level metrics (Total patients, appointments, revenue)
   */
  getSummary(): Promise<AnalyticsSummary>;

  /**
   * Get overall trends (New patients by month, Revenue by month, etc.)
   */
  getPatientTrends(from?: Date, to?: Date): Promise<PatientTrendResult>;

  /**
   * Get detailed month-wise financial and clinical grid breakdown (casemonthwise)
   */
  getMonthWiseBreakdown(fromYearMth: string, toYearMth: string): Promise<MonthWiseResult[]>;

  /**
   * Get month-wise patient balance dues for a given year
   */
  getMonthWiseDues(year: number): Promise<MonthWiseDueSummary[]>;

  /**
   * Get details of patients who have outstanding balances in a given month
   */
  getDueDetails(year: number, month: number): Promise<MonthWiseDueDetail[]>;

  /**
   * Get patients whose birthday falls in the given date range (ignoring year)
   */
  getBirthdays(fromMonthDay: string, toMonthDay: string): Promise<BirthdayPatient[]>;

  /**
   * Identify patients who already received an SMS notification on the given date
   */
  getSmsSentIds(date: Date, smsType: string): Promise<number[]>;

  /**
   * Get reference source statistics for a specific period
   */
  getReferenceListing(from: Date, to: Date): Promise<ReferenceListResult[]>;
}
