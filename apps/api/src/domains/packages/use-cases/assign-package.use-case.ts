import type { PackageRepository } from '../ports/package.repository';
import type { BillingRepository } from '../../billing/ports/billing.repository';
import type { AssignPackageDto } from '@mmc/types';
import { ok, type Result, fail } from '../../../shared/result';

export class AssignPackageUseCase {
  constructor(
    private readonly repo: PackageRepository,
    private readonly billingRepo: BillingRepository,
  ) {}

  async execute(dto: AssignPackageDto & { patientId: number }): Promise<Result<{ subscriptionId: number; expiryDate: string; billId: number }>> {
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

    // Step 1: Create the billing record for this package
    const billNo = await this.billingRepo.nextBillNo();
    const bill = await this.billingRepo.create({
      regid,
      billNo,
      billDate: new Date().toISOString().split('T')[0],
      charges: plan.price,
      received: 0,
      paymentMode: 'Cash',
      treatment: `Package: ${plan.name}`,
      disease: undefined,
      fromDate: startDateStr,
      toDate: expiryDateStr,
    });

    // Step 2: Create the package subscription, linked to the bill
    const subscriptionId = await this.repo.assignPackage({
      regid,
      packageId,
      patientId,
      startDate: startDateStr,
      expiryDate: expiryDateStr,
      notes,
      billId: bill.id,
    });

    return ok({ subscriptionId, expiryDate: expiryDateStr, billId: bill.id });
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
