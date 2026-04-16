import type { DayChargeRepository } from '../ports/accounts.repository';
import type { CreateDayChargeInput, UpdateDayChargeInput } from '@mmc/validation';
import type { DayCharge } from '@mmc/types';

export interface DayChargeResult {
  success: boolean;
  data?: DayCharge;
  error?: string;
}

export interface ListDayChargesResult {
  success: boolean;
  data?: DayCharge[];
  error?: string;
}

export class ListDayChargesUseCase {
  constructor(private readonly repo: DayChargeRepository) {}

  async execute(): Promise<ListDayChargesResult> {
    try {
      const charges = await this.repo.findAll();
      return { success: true, data: charges };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

export class GetDayChargeUseCase {
  constructor(private readonly repo: DayChargeRepository) {}

  async execute(id: number): Promise<DayChargeResult> {
    try {
      const charge = await this.repo.findById(id);
      if (!charge) return { success: false, error: 'Day charge not found' };
      return { success: true, data: charge };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

export class CreateDayChargeUseCase {
  constructor(private readonly repo: DayChargeRepository) {}

  async execute(input: CreateDayChargeInput): Promise<DayChargeResult> {
    if (!input.days) return { success: false, error: 'Days duration is required' };
    if (input.regularCharges < 0) return { success: false, error: 'Charges cannot be negative' };

    try {
      const charge = await this.repo.create(input);
      return { success: true, data: charge };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

export class UpdateDayChargeUseCase {
  constructor(private readonly repo: DayChargeRepository) {}

  async execute(id: number, input: UpdateDayChargeInput): Promise<DayChargeResult> {
    try {
      const updated = await this.repo.update(id, input);
      if (!updated) return { success: false, error: 'Day charge not found or already deleted' };
      return { success: true, data: updated };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

export class DeleteDayChargeUseCase {
  constructor(private readonly repo: DayChargeRepository) {}

  async execute(id: number): Promise<DayChargeResult> {
    try {
      const deleted = await this.repo.softDelete(id);
      if (!deleted) return { success: false, error: 'Day charge not found' };
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}