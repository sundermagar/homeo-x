import { type Result, ok, fail } from '../../../shared/result';
import type { ILeadRepository } from '../ports/lead.repository';

export class ManageLeadsUseCase {
  constructor(private readonly repo: ILeadRepository) {}

  async search(filters: { search?: string; status?: string; page: number; limit: number }): Promise<Result<{ data: any[]; total: number }>> {
    const result = await this.repo.findManyLeads(filters);
    return ok(result);
  }

  async getById(id: number): Promise<Result<any>> {
    const lead = await this.repo.findLeadById(id);
    if (!lead) return fail('Lead not found', 'NOT_FOUND');
    const followups = await this.repo.findFollowupsByLeadId(id);
    return ok({ ...lead, followups });
  }

  async create(dto: any): Promise<Result<number>> {
    if (!dto.name) return fail('Name is required', 'VALIDATION');
    const id = await this.repo.createLead(dto);
    return ok(id);
  }

  async update(id: number, dto: any): Promise<Result<void>> {
    await this.repo.updateLead(id, dto);
    return ok();
  }

  async delete(id: number): Promise<Result<void>> {
    await this.repo.deleteLead(id);
    return ok();
  }

  // Followups
  async addFollowup(leadId: number, dto: any): Promise<Result<number>> {
    const id = await this.repo.createFollowup(leadId, dto);
    return ok(id);
  }

  async updateFollowup(id: number, dto: any): Promise<Result<void>> {
    await this.repo.updateFollowup(id, dto);
    return ok();
  }

  async deleteFollowup(id: number): Promise<Result<void>> {
    await this.repo.deleteFollowup(id);
    return ok();
  }
}
