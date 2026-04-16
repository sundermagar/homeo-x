import type { AdditionalChargeRepository } from '../ports/accounts.repository';
import type { CreateAdditionalChargeInput, UpdateAdditionalChargeInput, ListAdditionalChargesQuery } from '@mmc/validation';
import type { AdditionalCharge, AdditionalChargeWithPatient } from '@mmc/types';

export interface AdditionalChargeResult {
  success: boolean;
  data?: AdditionalCharge;
  error?: string;
}

export interface ListAdditionalChargesResult {
  success: boolean;
  data?: { data: AdditionalChargeWithPatient[]; total: number };
  error?: string;
}

export class ListAdditionalChargesUseCase {
  constructor(private readonly repo: AdditionalChargeRepository) {}

  async execute(query: ListAdditionalChargesQuery): Promise<ListAdditionalChargesResult> {
    try {
      const result = await this.repo.findAll(query);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

export class GetAdditionalChargeUseCase {
  constructor(private readonly repo: AdditionalChargeRepository) {}

  async execute(id: number): Promise<AdditionalChargeResult> {
    try {
      const charge = await this.repo.findById(id);
      if (!charge) return { success: false, error: 'Additional charge not found' };
      return { success: true, data: charge };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

export class CreateAdditionalChargeUseCase {
  constructor(private readonly repo: AdditionalChargeRepository) {}

  async execute(input: CreateAdditionalChargeInput): Promise<AdditionalChargeResult> {
    if (!input.additionalName) return { success: false, error: 'Charge name is required' };
    if (input.additionalPrice < 0) return { success: false, error: 'Price cannot be negative' };

    try {
      const charge = await this.repo.create(input);
      return { success: true, data: charge };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

export class UpdateAdditionalChargeUseCase {
  constructor(private readonly repo: AdditionalChargeRepository) {}

  async execute(id: number, input: UpdateAdditionalChargeInput): Promise<AdditionalChargeResult> {
    try {
      const updated = await this.repo.update(id, input);
      if (!updated) return { success: false, error: 'Additional charge not found or already deleted' };
      return { success: true, data: updated };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

export class DeleteAdditionalChargeUseCase {
  constructor(private readonly repo: AdditionalChargeRepository) {}

  async execute(id: number): Promise<AdditionalChargeResult> {
    try {
      const deleted = await this.repo.softDelete(id);
      if (!deleted) return { success: false, error: 'Additional charge not found' };
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}