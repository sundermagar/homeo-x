import type { ExpenseWithHead, ExpenseHead } from '@mmc/types';
import type {
  CreateExpenseInput,
  UpdateExpenseInput,
  ListExpensesQuery,
  CreateExpenseHeadInput,
  UpdateExpenseHeadInput,
} from '@mmc/validation';

export interface ExpenseResult {
  success: boolean;
  data?: ExpenseWithHead;
  error?: string;
}

export interface ListExpensesResult {
  success: boolean;
  data?: { data: ExpenseWithHead[]; total: number };
  error?: string;
}

export interface ExpenseHeadResult {
  success: boolean;
  data?: ExpenseHead;
  error?: string;
}

export interface ListExpenseHeadsResult {
  success: boolean;
  data?: ExpenseHead[];
  error?: string;
}

export class ListExpensesUseCase {
  constructor(private readonly repo: ExpenseRepository) {}

  async execute(query: ListExpensesQuery): Promise<ListExpensesResult> {
    try {
      const result = await this.repo.findAll(query);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

export class GetExpenseUseCase {
  constructor(private readonly repo: ExpenseRepository) {}

  async execute(id: number): Promise<ExpenseResult> {
    try {
      const expense = await this.repo.findById(id);
      if (!expense) return { success: false, error: 'Expense not found' };
      return { success: true, data: expense };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

export class CreateExpenseUseCase {
  constructor(private readonly repo: ExpenseRepository) {}

  async execute(input: CreateExpenseInput): Promise<ExpenseResult> {
    if (!input.head) return { success: false, error: 'Expense head is required' };
    if (input.amount === undefined || input.amount < 0) return { success: false, error: 'Amount must be non-negative' };

    try {
      const expense = await this.repo.create(input);
      return { success: true, data: expense };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

export class UpdateExpenseUseCase {
  constructor(private readonly repo: ExpenseRepository) {}

  async execute(id: number, input: UpdateExpenseInput): Promise<ExpenseResult> {
    try {
      const updated = await this.repo.update(id, input);
      if (!updated) return { success: false, error: 'Expense not found or already deleted' };
      return { success: true, data: updated };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

export class DeleteExpenseUseCase {
  constructor(private readonly repo: ExpenseRepository) {}

  async execute(id: number): Promise<ExpenseResult> {
    try {
      const deleted = await this.repo.softDelete(id);
      if (!deleted) return { success: false, error: 'Expense not found' };
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

// ─── Expense Head Use Cases ──────────────────────────────────────────────────

export class ListExpenseHeadsUseCase {
  constructor(private readonly repo: ExpenseRepository) {}
  async execute(): Promise<ListExpenseHeadsResult> {
    try {
      const data = await this.repo.listHeads();
      return { success: true, data };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

export class GetExpenseHeadUseCase {
  constructor(private readonly repo: ExpenseRepository) {}
  async execute(id: number): Promise<ExpenseHeadResult> {
    try {
      const data = await this.repo.findHeadById(id);
      if (!data) return { success: false, error: 'Expense head not found' };
      return { success: true, data };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

export class CreateExpenseHeadUseCase {
  constructor(private readonly repo: ExpenseRepository) {}
  async execute(data: CreateExpenseHeadInput): Promise<ExpenseHeadResult> {
    try {
      const result = await this.repo.createHead(data);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

export class UpdateExpenseHeadUseCase {
  constructor(private readonly repo: ExpenseRepository) {}
  async execute(id: number, data: UpdateExpenseHeadInput): Promise<ExpenseHeadResult> {
    try {
      const result = await this.repo.updateHead(id, data);
      if (!result) return { success: false, error: 'Expense head not found' };
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

export class DeleteExpenseHeadUseCase {
  constructor(private readonly repo: ExpenseRepository) {}
  async execute(id: number): Promise<ExpenseHeadResult> {
    try {
      const success = await this.repo.deleteHead(id);
      if (!success) return { success: false, error: 'Expense head not found' };
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}