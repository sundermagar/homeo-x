import type { StaffMember } from '@mmc/types';
import type { StaffRepository } from '../ports/staff.repository';
import { type Result, ok } from '../../../shared/result';
import type { CreateStaffInput } from '@mmc/validation';

export class CreateStaffUseCase {
  constructor(private readonly staffRepo: StaffRepository) {}

  async execute(input: CreateStaffInput): Promise<Result<StaffMember>> {
    const staff = await this.staffRepo.create(input);
    return ok(staff);
  }
}
