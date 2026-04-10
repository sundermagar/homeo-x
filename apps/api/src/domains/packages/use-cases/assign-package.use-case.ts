import type { PackageRepository } from '../ports/package.repository';
import type { AssignPackageDto } from '@mmc/types';
import { ok, type Result, fail } from '../../../shared/result';

export class AssignPackageUseCase {
  constructor(private readonly repo: PackageRepository) {}

  async execute(dto: AssignPackageDto & { patientId: number }): Promise<Result<{ subscriptionId: number; expiryDate: string }>> {
    const { regid, packageId, startDate, patientId, notes } = dto;

    if (!patientId) return fail('patientId is required', 'VALIDATION');

    const plan = await this.repo.findPlanById(packageId);
    if (!plan) return fail(`Package plan #${packageId} not found`, 'NOT_FOUND');
    if (!plan.isActive) return fail('This package plan is no longer active', 'VALIDATION');

    const start = startDate ? new Date(startDate) : new Date();
    const expiry = new Date(start);
    expiry.setDate(expiry.getDate() + plan.durationDays);

    const fmt = (d: Date) => d.toISOString().split('T')[0]!;
    const startDateStr  = fmt(start);
    const expiryDateStr = fmt(expiry);

    const subscriptionId = await this.repo.assignPackage({
      regid,
      packageId,
      patientId,
      startDate: startDateStr,
      expiryDate: expiryDateStr,
      notes,
    });

    return ok({ subscriptionId, expiryDate: expiryDateStr });
  }

  async getPatientPackages(regid: number) {
    const packages = await this.repo.getPatientPackages(regid);
    return ok(packages);
  }

  async getActivePackage(regid: number) {
    const pkg = await this.repo.getActivePackage(regid);
    return ok(pkg);
  }

  async cancelSubscription(subscriptionId: number): Promise<Result<void>> {
    await this.repo.cancelSubscription(subscriptionId);
    return ok(undefined);
  }
}
