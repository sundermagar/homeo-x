import type { PackageRepository } from '../ports/package.repository';
import type { AssignPackageDto } from '@mmc/types';
import { ok, type Result } from '../../../shared/result';
import { NotFoundError, BadRequestError } from '../../../shared/errors';

export class AssignPackageUseCase {
  constructor(private readonly repo: PackageRepository) {}

  /**
   * Assigns a package plan to a patient:
   * 1. Validates patient & plan exist
   * 2. Calculates expiry based on duration_days
   * 3. Stores the subscription record
   * 4. Returns the new subscription ID + computed expiry
   */
  async execute(dto: AssignPackageDto & { patientId: number }): Promise<Result<{ subscriptionId: number; expiryDate: string }>> {
    const { regid, packageId, startDate, patientId, notes } = dto;

    if (!patientId) throw new BadRequestError('patientId is required');

    // Validate package plan exists
    const plan = await this.repo.findPlanById(packageId);
    if (!plan) throw new NotFoundError(`Package plan #${packageId} not found`);
    if (!plan.isActive) throw new BadRequestError('This package plan is no longer active');

    // Calculate expiry date
    const start = startDate ? new Date(startDate) : new Date();
    const expiry = new Date(start);
    expiry.setDate(expiry.getDate() + plan.durationDays);

    const fmt = (d: Date) => d.toISOString().split('T')[0]!;
    const startDateStr  = fmt(start);
    const expiryDateStr = fmt(expiry);

    // Create the subscription record
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
