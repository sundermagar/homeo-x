import type { OrganizationRepository } from '../ports/organization.repository.js';
import { NotFoundError } from '../../../shared/errors.js';

export class DeleteOrganizationUseCase {
  constructor(private readonly repo: OrganizationRepository) {}

  async execute(id: number): Promise<void> {
    const deleted = await this.repo.softDelete(id);
    if (!deleted) throw new NotFoundError(`Organization ${id} not found`);
  }
}
