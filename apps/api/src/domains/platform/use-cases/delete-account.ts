import type { AccountRepository } from '../ports/account.repository.js';
import { NotFoundError } from '../../../shared/errors.js';

export class DeleteAccountUseCase {
  constructor(private readonly repo: AccountRepository) {}

  /**
   * Soft-deletes from both public.accounts AND tenant.users (type='Account', context_id=id).
   */
  async execute(id: number): Promise<void> {
    const deleted = await this.repo.softDelete(id);
    if (!deleted) throw new NotFoundError(`Account ${id} not found`);
  }
}
