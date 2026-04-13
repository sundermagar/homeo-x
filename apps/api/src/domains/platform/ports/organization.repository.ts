import type { Organization, CreateOrganizationInput, UpdateOrganizationInput } from '@mmc/types';

/**
 * OrganizationRepository Port — defines what the domain needs from persistence.
 * The infrastructure layer provides the concrete adapter (PostgreSQL, in-memory, etc.)
 */
export interface OrganizationRepository {
  findAll(): Promise<Organization[]>;
  findById(id: number): Promise<Organization | null>;
  create(data: CreateOrganizationInput): Promise<Organization>;
  update(id: number, data: UpdateOrganizationInput): Promise<Organization | null>;
  softDelete(id: number): Promise<boolean>;
}
