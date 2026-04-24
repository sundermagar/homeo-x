import type { OrganizationRepository } from '../ports/organization.repository';
import type { Organization, UpdateOrganizationInput } from '@mmc/types';
import { NotFoundError } from '../../../shared/errors';

export class UpdateOrganizationUseCase {
  constructor(private readonly repo: OrganizationRepository) {}

  async execute(id: number, data: UpdateOrganizationInput): Promise<Organization> {
    const updated = await this.repo.update(id, data);
    if (!updated) throw new NotFoundError(`Organization ${id} not found`);
    return updated;
  }
}
