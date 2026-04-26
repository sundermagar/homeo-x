import type { StaffSummary, StaffCategory } from '@mmc/types';
import type { StaffRepository } from '../ports/staff.repository';
import { type Result, ok } from '../../../shared/result';

interface ListStaffInput {
  category: StaffCategory;
  page: number;
  limit: number;
  search?: string;
}

export class ListStaffUseCase {
  constructor(private readonly staffRepo: StaffRepository) {}

  async execute(input: ListStaffInput): Promise<Result<{ data: StaffSummary[]; total: number }>> {
    const result = await this.staffRepo.findAll(input);
    return ok(result);
  }
}
