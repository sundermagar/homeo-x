import type { StaffSummary, StaffCategory } from '@mmc/types';
import type { StaffRepository } from '../ports/staff.repository';
import { type Result, ok } from '../../../shared/result';

interface ListStaffInput {
  category: StaffCategory;
  page: number;
  limit: number;
  search?: string;
  clinicId?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export class ListStaffUseCase {
  constructor(private readonly staffRepo: StaffRepository) {}

  async execute(input: ListStaffInput): Promise<Result<{ data: StaffSummary[]; total: number; activeCount: number }>> {
    const result = await this.staffRepo.findAll(input);
    return ok(result);
  }
}
