import { type Result, ok } from '../../../shared/result';
import type { ILeadRepository } from '../ports/lead.repository';

export class ManageReferralsUseCase {
  constructor(private readonly repo: ILeadRepository) {}

  async getSummary(): Promise<Result<any[]>> {
    const res = await this.repo.findReferralSummary();
    return ok(res);
  }

  async getDetails(referralId: number): Promise<Result<any[]>> {
    const res = await this.repo.findReferralDetails(referralId);
    return ok(res);
  }

  async create(dto: any): Promise<Result<number>> {
    const id = await this.repo.createReferral(dto);
    return ok(id);
  }

  async delete(id: number): Promise<Result<void>> {
    await this.repo.deleteReferral(id);
    return ok();
  }
}
