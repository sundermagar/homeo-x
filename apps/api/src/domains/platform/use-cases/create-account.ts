import type { AccountRepository } from '../ports/account.repository';
import type { Account, CreateAccountInput } from '@mmc/types';
import { ConflictError } from '../../../shared/errors';

/**
 * CreateAccountUseCase
 *
 * Business logic for creating a clinic admin account.
 * Mirrors the legacy dual-write behaviour:
 *   1. Insert into public.accounts
 *   2. Mirror into tenant.users with type='Account', context_id=accountId
 *
 * Both writes run in a DB transaction to ensure data integrity.
 */
export class CreateAccountUseCase {
  constructor(private readonly repo: AccountRepository) {}

  async execute(data: CreateAccountInput): Promise<Account> {
    // Email uniqueness is checked inside the repository adapter
    // to keep the domain free from DB concerns
    return this.repo.create(data);
  }
}
