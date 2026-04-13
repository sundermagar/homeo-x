import type { StaffCategory } from '@mmc/types';
import type { StaffRepository } from '../ports/staff.repository';
import { type Result, ok, fail } from '../../../shared/result';

export class DeleteStaffUseCase {
  constructor(private readonly staffRepo: StaffRepository) {}

  async execute(category: StaffCategory, id: number): Promise<Result<boolean>> {
    const deleted = await this.staffRepo.softDelete(category, id);
    if (!deleted) return fail('Staff member not found', 'NOT_FOUND');
    return ok(true);
  }
}
