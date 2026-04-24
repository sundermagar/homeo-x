import type { Account, CreateAccountInput, UpdateAccountInput } from '@mmc/types';

/**
 * AccountRepository Port — dual-write contract.
 * Creating an account MUST create a corresponding record in the tenant's users table
 * (with type='Account') to allow authentication. This mirrors the legacy behaviour
 * in mmc-javascript/server/src/modules/accounts/router.js.
 */
export interface AccountRepository {
  findAll(clinicId?: number): Promise<Account[]>;
  findById(id: number): Promise<Account | null>;
  /**
   * Dual-write: inserts into `public.accounts` AND `<tenant>.users` (type='Account').
   * Must run in a transaction.
   */
  create(data: CreateAccountInput): Promise<Account>;
  /**
   * Updates `public.accounts`. If name changed, syncs name to `<tenant>.users`
   * WHERE context_id = id AND type = 'Account'.
   */
  update(id: number, data: UpdateAccountInput): Promise<Account | null>;
  /**
   * Soft-deletes from both `public.accounts` AND `<tenant>.users`.
   */
  softDelete(id: number): Promise<boolean>;
}
