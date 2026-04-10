import { Result, ok, fail } from '../../../shared/result.js';
import type { IAnalyticsRepository } from '../ports/analytics.repository.js';
import type {
  AnalyticsSummary, PatientTrendResult, MonthWiseResult,
  MonthWiseDueSummary, MonthWiseDueDetail, BirthdayPatient,
  ReferenceListResult
} from '@mmc/types';

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

export class AnalyticsUseCases {
  constructor(private readonly repo: IAnalyticsRepository) {}

  async getSummary(): Promise<Result<AnalyticsSummary>> {
    try {
      const data = await this.repo.getSummary();
      return ok(data);
    } catch (err) {
      return fail(errMsg(err));
    }
  }

  async getPatientTrends(from?: Date, to?: Date): Promise<Result<PatientTrendResult>> {
    try {
      const data = await this.repo.getPatientTrends(from, to);
      return ok(data);
    } catch (err) {
      return fail(errMsg(err));
    }
  }

  async getMonthWiseBreakdown(fromYearMth: string, toYearMth: string): Promise<Result<MonthWiseResult[]>> {
    try {
      if (!fromYearMth || !toYearMth) return fail('Date range is required', 'VALIDATION');
      const data = await this.repo.getMonthWiseBreakdown(fromYearMth, toYearMth);
      return ok(data);
    } catch (err) {
      return fail(errMsg(err));
    }
  }

  async getMonthWiseDues(year: number): Promise<Result<MonthWiseDueSummary[]>> {
    try {
      const data = await this.repo.getMonthWiseDues(year);
      return ok(data);
    } catch (err) {
      return fail(errMsg(err));
    }
  }

  async getDueDetails(year: number, month: number): Promise<Result<MonthWiseDueDetail[]>> {
    try {
      const data = await this.repo.getDueDetails(year, month);
      return ok(data);
    } catch (err) {
      return fail(errMsg(err));
    }
  }

  async getBirthdays(fromMonthDay: string, toMonthDay: string): Promise<Result<{ patients: BirthdayPatient[]; smsSentIds: number[] }>> {
    try {
      const patients = await this.repo.getBirthdays(fromMonthDay, toMonthDay);
      const smsSentIds = await this.repo.getSmsSentIds(new Date(), 'birthday');
      return ok({ patients, smsSentIds });
    } catch (err) {
      return fail(errMsg(err));
    }
  }

  async getReferenceListing(from: Date, to: Date): Promise<Result<ReferenceListResult[]>> {
    try {
      const data = await this.repo.getReferenceListing(from, to);
      return ok(data);
    } catch (err) {
      return fail(errMsg(err));
    }
  }
}
