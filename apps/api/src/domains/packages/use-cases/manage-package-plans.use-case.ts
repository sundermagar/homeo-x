import type { PackageRepository } from '../ports/package.repository';
import type { CreatePackagePlanDto, UpdatePackagePlanDto } from '@mmc/types';
import { ok, type Result } from '../../../shared/result';
import { NotFoundError } from '../../../shared/errors';

export class ManagePackagePlansUseCase {
  constructor(private readonly repo: PackageRepository) {}

  async listPlans() {
    const plans = await this.repo.findAllPlans();
    return ok(plans);
  }

  async getPlan(id: number) {
    const plan = await this.repo.findPlanById(id);
    if (!plan) throw new NotFoundError(`Package plan #${id} not found`);
    return ok(plan);
  }

  async createPlan(dto: CreatePackagePlanDto): Promise<Result<{ id: number }>> {
    const id = await this.repo.createPlan(dto);
    return ok({ id });
  }

  async updatePlan(id: number, dto: UpdatePackagePlanDto): Promise<Result<void>> {
    const existing = await this.repo.findPlanById(id);
    if (!existing) throw new NotFoundError(`Package plan #${id} not found`);
    await this.repo.updatePlan(id, dto);
    return ok(undefined);
  }

  async deletePlan(id: number): Promise<Result<void>> {
    const existing = await this.repo.findPlanById(id);
    if (!existing) throw new NotFoundError(`Package plan #${id} not found`);
    await this.repo.deletePlan(id);
    return ok(undefined);
  }
}
