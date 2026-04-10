import type {
  PackagePlan,
  PatientPackage,
  PackageExpiryRecord,
  CreatePackagePlanDto,
  UpdatePackagePlanDto,
  AssignPackageDto,
} from '@mmc/types';

export interface PackageRepository {
  // ─── Package Plan CRUD ───────────────────────────────────────────────────
  findAllPlans(): Promise<PackagePlan[]>;
  findPlanById(id: number): Promise<PackagePlan | null>;
  createPlan(dto: CreatePackagePlanDto): Promise<number>;
  updatePlan(id: number, dto: UpdatePackagePlanDto): Promise<void>;
  deletePlan(id: number): Promise<void>;

  // ─── Patient Subscriptions ───────────────────────────────────────────────
  assignPackage(dto: AssignPackageDto & { patientId: number; expiryDate: string; billId?: number }): Promise<number>;
  getPatientPackages(regid: number): Promise<PatientPackage[]>;
  getActivePackage(regid: number): Promise<PatientPackage | null>;
  cancelSubscription(subscriptionId: number): Promise<void>;

  // ─── Analytics ───────────────────────────────────────────────────────────
  getExpiryAnalytics(fromDate: string, toDate: string): Promise<PackageExpiryRecord[]>;
  getRevenueStats(): Promise<{ totalRevenue: number; activeCount: number; expiredCount: number }>;
}
