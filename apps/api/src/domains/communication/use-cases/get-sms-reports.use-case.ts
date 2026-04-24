import { Result, ok, fail } from '../../../shared/result.js';
import type { ICommunicationRepository } from '../ports/communication.repository.js';
import type { SmsReport, SmsReportFilters } from '@mmc/types';

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

export class GetSmsReportsUseCase {
  constructor(private repo: ICommunicationRepository) {}

  async execute(filters: SmsReportFilters): Promise<Result<{ data: SmsReport[]; total: number }>> {
    try {
      const result = await this.repo.listReports({
        page: filters.page ?? 1,
        limit: filters.limit ?? 50,
        ...filters,
      });
      return ok(result);
    } catch (err) {
      return fail(errMsg(err));
    }
  }
}
