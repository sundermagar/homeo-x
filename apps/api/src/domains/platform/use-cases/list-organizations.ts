import type { OrganizationRepository } from '../ports/organization.repository';
import type { Organization } from '@mmc/types';

export class ListOrganizationsUseCase {
  constructor(private readonly repo: OrganizationRepository) {}

  async execute(): Promise<Organization[]> {
    return this.repo.findAll();
  }
}
