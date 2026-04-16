import type { DepositRepository } from '../ports/accounts.repository';
import type { CreateBankDepositInput, CreateCashDepositInput, UpdateBankDepositInput, UpdateCashDepositInput, ListDepositsQuery } from '@mmc/validation';
import type { BankDeposit, CashDeposit } from '@mmc/types';

export interface DepositResult {
  success: boolean;
  data?: BankDeposit | CashDeposit;
  error?: string;
}

export interface ListDepositsResult {
  success: boolean;
  data?: { data: (BankDeposit | CashDeposit)[]; total: number };
  error?: string;
}

// ─── Bank Deposits ──────────────────────────────────────────────────────────────

export class ListBankDepositsUseCase {
  constructor(private readonly repo: DepositRepository) {}

  async execute(query: ListDepositsQuery): Promise<ListDepositsResult> {
    try {
      const result = await this.repo.findAllByType('Bank', query);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

export class CreateBankDepositUseCase {
  constructor(private readonly repo: DepositRepository) {}

  async execute(input: CreateBankDepositInput): Promise<DepositResult> {
    if (!input.depositDate) return { success: false, error: 'Deposit date is required' };
    if (!input.amount) return { success: false, error: 'Amount is required' };

    try {
      const deposit = await this.repo.createBankDeposit(input);
      return { success: true, data: deposit };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

export class UpdateBankDepositUseCase {
  constructor(private readonly repo: DepositRepository) {}

  async execute(id: number, input: UpdateBankDepositInput): Promise<DepositResult> {
    try {
      const updated = await this.repo.updateBankDeposit(id, input);
      if (!updated) return { success: false, error: 'Bank deposit not found or already deleted' };
      return { success: true, data: updated };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

export class DeleteBankDepositUseCase {
  constructor(private readonly repo: DepositRepository) {}

  async execute(id: number): Promise<DepositResult> {
    try {
      const deleted = await this.repo.softDelete(id, 'Bank');
      if (!deleted) return { success: false, error: 'Bank deposit not found' };
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

// ─── Cash Deposits ──────────────────────────────────────────────────────────────

export class ListCashDepositsUseCase {
  constructor(private readonly repo: DepositRepository) {}

  async execute(query: ListDepositsQuery): Promise<ListDepositsResult> {
    try {
      const result = await this.repo.findAllByType('Cash', query);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

export class CreateCashDepositUseCase {
  constructor(private readonly repo: DepositRepository) {}

  async execute(input: CreateCashDepositInput): Promise<DepositResult> {
    if (!input.depositDate) return { success: false, error: 'Deposit date is required' };
    if (!input.amount) return { success: false, error: 'Amount is required' };

    try {
      const deposit = await this.repo.createCashDeposit(input);
      return { success: true, data: deposit };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

export class UpdateCashDepositUseCase {
  constructor(private readonly repo: DepositRepository) {}

  async execute(id: number, input: UpdateCashDepositInput): Promise<DepositResult> {
    try {
      const updated = await this.repo.updateCashDeposit(id, input);
      if (!updated) return { success: false, error: 'Cash deposit not found or already deleted' };
      return { success: true, data: updated };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

export class DeleteCashDepositUseCase {
  constructor(private readonly repo: DepositRepository) {}

  async execute(id: number): Promise<DepositResult> {
    try {
      const deleted = await this.repo.softDelete(id, 'Cash');
      if (!deleted) return { success: false, error: 'Cash deposit not found' };
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}