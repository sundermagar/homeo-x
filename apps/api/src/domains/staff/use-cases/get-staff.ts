import type { StaffMember, StaffCategory } from '@mmc/types';
import type { StaffRepository } from '../ports/staff.repository.js';
import { type Result, ok, fail } from '../../../shared/result.js';

export class GetStaffUseCase {
  constructor(private readonly staffRepo: StaffRepository) {}

  async execute(category: StaffCategory, id: number): Promise<Result<StaffMember>> {
    const staff = await this.staffRepo.findById(category, id);
    if (!staff) return fail('Staff member not found', 'NOT_FOUND');
    return ok(staff);
  }
}
