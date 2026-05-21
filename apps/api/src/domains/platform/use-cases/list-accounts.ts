import type { AccountRepository } from '../ports/account.repository.js';
import type { Account } from '@mmc/types';

export class ListAccountsUseCase {
  constructor(private readonly repo: AccountRepository) {}

  async execute(clinicId?: number): Promise<Account[]> {
    return this.repo.findAll(clinicId);
  }
}
