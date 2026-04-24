import type { StaffMember, StaffSummary, StaffCategory } from '@mmc/types';
import type { CreateStaffInput, UpdateStaffInput } from '@mmc/validation';

/**
 * Staff Repository Port — defines what the domain needs from persistence.
 */
export interface StaffRepository {
  findAll(params: {
    category: StaffCategory;
    page: number;
    limit: number;
    search?: string;
    clinicId?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{ data: StaffSummary[]; total: number; activeCount: number }>;

  findById(category: StaffCategory, id: number): Promise<StaffMember | null>;

  create(data: CreateStaffInput): Promise<StaffMember>;

  update(category: StaffCategory, id: number, data: UpdateStaffInput): Promise<StaffMember | null>;

  delete(category: StaffCategory, id: number): Promise<boolean>;
}
