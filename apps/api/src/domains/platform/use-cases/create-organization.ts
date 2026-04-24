import type { OrganizationRepository } from '../ports/organization.repository';
import type { Organization, CreateOrganizationInput } from '@mmc/types';

export class CreateOrganizationUseCase {
  constructor(private readonly repo: OrganizationRepository) {}

  async execute(data: CreateOrganizationInput): Promise<Organization> {
    return this.repo.create(data);
  }
}
