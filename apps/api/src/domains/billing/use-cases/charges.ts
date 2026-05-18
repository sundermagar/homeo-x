import type { Result } from '../../../shared/result.js';
import { ok, fail } from '../../../shared/result.js';
import type { ChargeRepository } from '../ports/accounts.repository.js';
import type { Charge } from '@mmc/types';
import type { CreateChargeInput, UpdateChargeInput } from '@mmc/validation';

export class ListChargesUseCase {
  constructor(private readonly repo: ChargeRepository) {}

  async execute(): Promise<Result<Charge[]>> {
    try {
      const result = await this.repo.findAll();
      return ok(result);
    } catch (err) {
      return fail((err as Error).message);
    }
  }
}

export class GetChargeUseCase {
  constructor(private readonly repo: ChargeRepository) {}

  async execute(id: number): Promise<Result<Charge>> {
    try {
      const result = await this.repo.findById(id);
      if (!result) return fail('Charge not found');
      return ok(result);
    } catch (err) {
      return fail((err as Error).message);
    }
  }
}

export class CreateChargeUseCase {
  constructor(private readonly repo: ChargeRepository) {}

  async execute(input: CreateChargeInput): Promise<Result<Charge>> {
    try {
      const result = await this.repo.create(input);
      return ok(result);
    } catch (err) {
      return fail((err as Error).message);
    }
  }
}

export class UpdateChargeUseCase {
  constructor(private readonly repo: ChargeRepository) {}

  async execute(id: number, input: UpdateChargeInput): Promise<Result<Charge>> {
    try {
      const exists = await this.repo.findById(id);
      if (!exists) return fail('Charge not found');

      const result = await this.repo.update(id, input);
      if (!result) return fail('Failed to update charge');
      return ok(result);
    } catch (err) {
      return fail((err as Error).message);
    }
  }
}

export class DeleteChargeUseCase {
  constructor(private readonly repo: ChargeRepository) {}

  async execute(id: number): Promise<Result<boolean>> {
    try {
      const exists = await this.repo.findById(id);
      if (!exists) return fail('Charge not found');

      const result = await this.repo.softDelete(id);
      return ok(result);
    } catch (err) {
      return fail((err as Error).message);
    }
  }
}
