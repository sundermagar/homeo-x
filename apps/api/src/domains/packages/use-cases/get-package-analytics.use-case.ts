import type { PackageRepository } from '../ports/package.repository';
import { ok } from '../../../shared/result';

export class GetPackageAnalyticsUseCase {
  constructor(private readonly repo: PackageRepository) {}

  /**
   * Returns all patient subscriptions expiring within the given date range.
   * Defaults to current month if no dates provided.
   */
  async getExpiryReport(fromDate?: string, toDate?: string) {
    const today = new Date();
    const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString().split('T')[0]!;
    const defaultTo = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      .toISOString().split('T')[0]!;

    const from = fromDate ?? defaultFrom;
    const to   = toDate   ?? defaultTo;

    const records = await this.repo.getExpiryAnalytics(from, to);

    // Enrich each record with daysRemaining & status
    const todayStr = today.toISOString().split('T')[0]!;
    const enriched = records.map(r => {
      const ms = new Date(r.expiryDate).getTime() - new Date(todayStr).getTime();
      const daysRemaining = Math.ceil(ms / 86_400_000);
      return {
        ...r,
        daysRemaining,
        status: daysRemaining < 0 ? 'Expired' : daysRemaining <= 7 ? 'ExpiringSoon' : 'Active',
      };
    });

    return ok({ from, to, records: enriched });
  }

  async getRevenueStats() {
    const stats = await this.repo.getRevenueStats();
    return ok(stats);
  }
}
