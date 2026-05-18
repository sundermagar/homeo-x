import type { PackageRepository } from '../ports/package.repository.js';
import type { BillingRepository } from '../../billing/ports/billing.repository.js';
import type { AssignPackageDto } from '@mmc/types';
import { ok, type Result, fail } from '../../../shared/result.js';
import type { MedicalCaseRepository } from '../../medical-case/ports/medical-case.repository.js';
import type { SendSmsUseCase } from '../../communication/use-cases/send-sms.use-case.js';

export class AssignPackageUseCase {
  constructor(
    private readonly repo: PackageRepository,
    private readonly billingRepo: BillingRepository,
    private readonly patientRepo?: MedicalCaseRepository,
    private readonly smsUseCase?: SendSmsUseCase,
  ) {}

  async execute(dto: AssignPackageDto & { patientId: number }): Promise<Result<{ subscriptionId: number; expiryDate: string; billId: number }>> {
    const { regid, packageId, startDate, patientId, notes } = dto;

    if (!patientId) return fail('patientId is required', 'VALIDATION');

    const plan = await this.repo.findPlanById(packageId);
    if (!plan) return fail(`Package plan #${packageId} not found`, 'NOT_FOUND');
    if (!plan.isActive) return fail('This package plan is no longer active', 'VALIDATION');

    let start = startDate ? new Date(startDate) : new Date();

    // If 'expiry' is selected, check for an existing active package and start from its expiry
    if (dto.startFrom === 'expiry') {
      const activePkg = await this.repo.getActivePackage(regid);
      if (activePkg && activePkg.expiryDate) {
        const currentExpiry = new Date(activePkg.expiryDate);
        // Start from next day of current expiry
        start = new Date(currentExpiry);
        start.setDate(start.getDate() + 1);
      }
    }

    const expiry = new Date(start);
    const months = Math.max(1, Math.round(plan.durationDays / 30));
    expiry.setMonth(expiry.getMonth() + months);
    if (expiry.getDate() !== start.getDate()) {
      expiry.setDate(0);
    }

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

    // Step 3: Send SMS notification (matching legacy behavior)
    if (this.patientRepo && this.smsUseCase) {
      const fullData = await this.patientRepo.getUnifiedCaseData(regid);
      if (fullData && fullData.medicalCase) {
        const phone = (fullData.medicalCase as any).mobile || (fullData.medicalCase as any).phone;
        if (phone) {
          const patientName = (fullData.medicalCase as any).patientName || 'Patient';
          // We intentionally don't await this to avoid blocking the API response
          this.smsUseCase.sendPackageAssignment({
            regid,
            phone,
            patientName,
            date: startDateStr,
            packageName: plan.name,
          }).catch(console.error);
        }
      }
    }

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
