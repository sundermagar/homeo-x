import type { StaffCategory } from '@mmc/types';
import type { CreateStaffInput, UpdateStaffInput } from '@mmc/validation';

export class ListStaffUseCase {
  constructor(private readonly repo: any) {}
  async execute(params: { category: StaffCategory; page: number; limit: number; search?: string }) {
    try {
      const result = await this.repo.findAll(params);
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export class GetStaffUseCase {
  constructor(private readonly repo: any) {}
  async execute(category: StaffCategory, id: number) {
    try {
      const data = await this.repo.findById(category, id);
      if (!data) return { success: false, error: 'Staff member not found' };
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export class CreateStaffUseCase {
  constructor(private readonly repo: any) {}
  async execute(data: CreateStaffInput) {
    try {
      const result = await this.repo.create(data);
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export class UpdateStaffUseCase {
  constructor(private readonly repo: any) {}
  async execute(category: StaffCategory, id: number, data: UpdateStaffInput) {
    try {
      const result = await this.repo.update(category, id, data);
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export class DeleteStaffUseCase {
  constructor(private readonly repo: any) {}
  async execute(category: StaffCategory, id: number) {
    try {
      await this.repo.delete(category, id);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
