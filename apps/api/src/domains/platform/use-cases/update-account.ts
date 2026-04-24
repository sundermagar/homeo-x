import type { AccountRepository } from '../ports/account.repository';
import type { Account, UpdateAccountInput } from '@mmc/types';
import { NotFoundError } from '../../../shared/errors';

export class UpdateAccountUseCase {
  constructor(private readonly repo: AccountRepository) {}

  async execute(id: number, data: UpdateAccountInput): Promise<Account> {
    const updated = await this.repo.update(id, data);
    if (!updated) throw new NotFoundError(`Account ${id} not found`);
    return updated;
  }
}
