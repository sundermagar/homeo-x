import type { PackageRepository } from '../ports/package.repository';
import type { CreatePackagePlanDto, UpdatePackagePlanDto } from '@mmc/types';
import { ok, type Result, fail } from '../../../shared/result';

export class ManagePackagePlansUseCase {
  constructor(private readonly repo: PackageRepository) {}

  async listPlans() {
    const plans = await this.repo.findAllPlans();
    return ok(plans);
  }

  async getPlan(id: number) {
    const plan = await this.repo.findPlanById(id);
    if (!plan) return fail(`Package plan #${id} not found`, 'NOT_FOUND');
    return ok(plan);
  }

  async createPlan(dto: CreatePackagePlanDto): Promise<Result<{ id: number }>> {
    const id = await this.repo.createPlan(dto);
    return ok({ id });
  }

  async updatePlan(id: number, dto: UpdatePackagePlanDto): Promise<Result<void>> {
    const existing = await this.repo.findPlanById(id);
    if (!existing) return fail(`Package plan #${id} not found`, 'NOT_FOUND');
    await this.repo.updatePlan(id, dto);
    return ok(undefined);
  }

  async deletePlan(id: number): Promise<Result<void>> {
    const existing = await this.repo.findPlanById(id);
    if (!existing) return fail(`Package plan #${id} not found`, 'NOT_FOUND');
    await this.repo.deletePlan(id);
    return ok(undefined);
  }
}
