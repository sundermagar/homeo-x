import type { StaffMember, StaffCategory } from '@mmc/types';
import type { StaffRepository } from '../ports/staff.repository';
import { type Result, ok, fail } from '../../../shared/result';
import type { UpdateStaffInput } from '@mmc/validation';

export class UpdateStaffUseCase {
  constructor(private readonly staffRepo: StaffRepository) {}

  async execute(category: StaffCategory, id: number, input: UpdateStaffInput): Promise<Result<StaffMember>> {
    const staff = await this.staffRepo.update(category, id, input);
    if (!staff) return fail('Staff member not found', 'NOT_FOUND');
    return ok(staff);
  }
}
