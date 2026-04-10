import { eq, and, isNull, gte, lte, sql, desc } from 'drizzle-orm';
import type { DbClient } from '@mmc/database';
import * as schema from '@mmc/database';
import type {
  PackagePlan, PatientPackage, PackageExpiryRecord,
  CreatePackagePlanDto, UpdatePackagePlanDto, AssignPackageDto,
} from '@mmc/types';
import type { PackageRepository } from '../../domains/packages/ports/package.repository';

export class PackageRepositoryPG implements PackageRepository {
  constructor(private readonly db: DbClient) {}

  // ─── Package Plans CRUD ─────────────────────────────────────────────────────

  async findAllPlans(): Promise<PackagePlan[]> {
    const rows = await this.db
      .select()
      .from(schema.packagePlans)
      .where(isNull(schema.packagePlans.deletedAt))
      .orderBy(schema.packagePlans.name);
    return rows.map(this.mapPlan);
  }

  async findPlanById(id: number): Promise<PackagePlan | null> {
    const [row] = await this.db
      .select()
      .from(schema.packagePlans)
      .where(and(eq(schema.packagePlans.id, id), isNull(schema.packagePlans.deletedAt)))
      .limit(1);
    return row ? this.mapPlan(row) : null;
  }

  async createPlan(dto: CreatePackagePlanDto): Promise<number> {
    const [row] = await this.db
      .insert(schema.packagePlans)
      .values({
        name:         dto.name,
        description:  dto.description ?? null,
        price:        dto.price,
        durationDays: dto.durationDays,
        colorCode:    dto.colorCode ?? '#2563EB',
      })
      .returning({ id: schema.packagePlans.id });
    return row?.id ?? 0;
  }

  async updatePlan(id: number, dto: UpdatePackagePlanDto): Promise<void> {
    const fields: Partial<typeof schema.packagePlans.$inferInsert> = {};
    if (dto.name         !== undefined) fields.name         = dto.name;
    if (dto.description  !== undefined) fields.description  = dto.description;
    if (dto.price        !== undefined) fields.price        = dto.price;
    if (dto.durationDays !== undefined) fields.durationDays = dto.durationDays;
    if (dto.colorCode    !== undefined) fields.colorCode    = dto.colorCode;
    if (dto.isActive     !== undefined) fields.isActive     = dto.isActive;
    fields.updatedAt = new Date();
    await this.db.update(schema.packagePlans).set(fields).where(eq(schema.packagePlans.id, id));
  }

  async deletePlan(id: number): Promise<void> {
    await this.db
      .update(schema.packagePlans)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.packagePlans.id, id));
  }

  // ─── Patient Subscriptions ──────────────────────────────────────────────────

  async assignPackage(dto: AssignPackageDto & { patientId: number; expiryDate: string; billId?: number }): Promise<number> {
    const [row] = await this.db
      .insert(schema.patientPackages)
      .values({
        patientId:  dto.patientId,
        regid:      dto.regid,
        packageId:  dto.packageId,
        startDate:  dto.startDate!,
        expiryDate: dto.expiryDate,
        status:     'Active',
        billId:     dto.billId ?? null,
        notes:      dto.notes ?? null,
      })
      .returning({ id: schema.patientPackages.id });
    return row?.id ?? 0;
  }

  async getPatientPackages(regid: number): Promise<PatientPackage[]> {
    const rows = await this.db
      .select({
        pp: schema.patientPackages,
        planName:  schema.packagePlans.name,
        planPrice: schema.packagePlans.price,
        colorCode: schema.packagePlans.colorCode,
      })
      .from(schema.patientPackages)
      .leftJoin(schema.packagePlans, eq(schema.patientPackages.packageId, schema.packagePlans.id))
      .where(and(eq(schema.patientPackages.regid, regid), isNull(schema.patientPackages.deletedAt)))
      .orderBy(desc(schema.patientPackages.id));

    return rows.map(r => ({
      ...r.pp,
      packageName:  r.planName  ?? undefined,
      packagePrice: r.planPrice ?? undefined,
      colorCode:    r.colorCode ?? undefined,
    })) as PatientPackage[];
  }

  async getActivePackage(regid: number): Promise<PatientPackage | null> {
    const today = new Date().toISOString().split('T')[0]!;
    const [row] = await this.db
      .select({
        pp: schema.patientPackages,
        planName:  schema.packagePlans.name,
        planPrice: schema.packagePlans.price,
        colorCode: schema.packagePlans.colorCode,
      })
      .from(schema.patientPackages)
      .leftJoin(schema.packagePlans, eq(schema.patientPackages.packageId, schema.packagePlans.id))
      .where(
        and(
          eq(schema.patientPackages.regid, regid),
          eq(schema.patientPackages.status, 'Active'),
          gte(schema.patientPackages.expiryDate, today),
          isNull(schema.patientPackages.deletedAt)
        )
      )
      .limit(1);

    if (!row) return null;
    return { ...row.pp, packageName: row.planName ?? undefined, packagePrice: row.planPrice ?? undefined, colorCode: row.colorCode ?? undefined } as PatientPackage;
  }

  async cancelSubscription(subscriptionId: number): Promise<void> {
    await this.db
      .update(schema.patientPackages)
      .set({ status: 'Cancelled', updatedAt: new Date() })
      .where(eq(schema.patientPackages.id, subscriptionId));
  }

  // ─── Analytics ──────────────────────────────────────────────────────────────

  async getExpiryAnalytics(fromDate: string, toDate: string): Promise<PackageExpiryRecord[]> {
    const rows = await this.db
      .select({
        patientId:    schema.patientPackages.patientId,
        regid:        schema.patientPackages.regid,
        startDate:    schema.patientPackages.startDate,
        expiryDate:   schema.patientPackages.expiryDate,
        packageName:  schema.packagePlans.name,
        packagePrice: schema.packagePlans.price,
        colorCode:    schema.packagePlans.colorCode,
        firstName:    sql<string>`''`,
        surname:      sql<string>`''`,
        phone:        sql<string | null>`null`,
        daysRemaining: sql<number>`0`,
        status:       schema.patientPackages.status,
      })
      .from(schema.patientPackages)
      .leftJoin(schema.packagePlans, eq(schema.patientPackages.packageId, schema.packagePlans.id))
      .where(
        and(
          gte(schema.patientPackages.expiryDate, fromDate),
          lte(schema.patientPackages.expiryDate, toDate),
          isNull(schema.patientPackages.deletedAt)
        )
      )
      .orderBy(schema.patientPackages.expiryDate);

    return rows as any;
  }

  async getRevenueStats(): Promise<{ totalRevenue: number; activeCount: number; expiredCount: number }> {
    const today = new Date().toISOString().split('T')[0]!;
    const [active] = await this.db
      .select({ count: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${schema.packagePlans.price}), 0)` })
      .from(schema.patientPackages)
      .leftJoin(schema.packagePlans, eq(schema.patientPackages.packageId, schema.packagePlans.id))
      .where(and(eq(schema.patientPackages.status, 'Active'), gte(schema.patientPackages.expiryDate, today), isNull(schema.patientPackages.deletedAt)));

    const [expired] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.patientPackages)
      .where(and(eq(schema.patientPackages.status, 'Expired'), isNull(schema.patientPackages.deletedAt)));

    return {
      totalRevenue: active?.total ?? 0,
      activeCount:  active?.count ?? 0,
      expiredCount: expired?.count ?? 0,
    };
  }

  private mapPlan(row: typeof schema.packagePlans.$inferSelect): PackagePlan {
    return {
      id:           row.id,
      name:         row.name,
      description:  row.description ?? undefined,
      price:        row.price ?? 0,
      durationDays: row.durationDays ?? 30,
      colorCode:    row.colorCode ?? '#2563EB',
      isActive:     row.isActive ?? true,
      createdAt:    row.createdAt ?? undefined,
      updatedAt:    row.updatedAt ?? undefined,
    };
  }
}
