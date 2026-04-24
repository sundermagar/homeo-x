import { eq, isNull, and, desc } from 'drizzle-orm';
import { organizations } from '@mmc/database/schema';
import type { DbClient } from '@mmc/database';
import type { Organization, CreateOrganizationInput, UpdateOrganizationInput } from '@mmc/types';
import type { OrganizationRepository } from '../../domains/platform/ports/organization.repository';

export class OrganizationRepositoryPg implements OrganizationRepository {
  constructor(private readonly db: DbClient) { }

  async findAll(): Promise<Organization[]> {
    const rows = await this.db
      .select()
      .from(organizations)
      .where(isNull(organizations.deletedAt))
      .orderBy(desc(organizations.id));
    return rows.map(this.toDomain);
  }

  async findById(id: number): Promise<Organization | null> {
    const [row] = await this.db
      .select()
      .from(organizations)
      .where(and(eq(organizations.id, id), isNull(organizations.deletedAt)))
      .limit(1);
    return row ? this.toDomain(row) : null;
  }

  async create(data: CreateOrganizationInput): Promise<Organization> {
    // Normalize connectSince: ensure YYYY-MM-DD
    let connectSince = data.connectSince || '1990-01-01';
    if (connectSince.length === 4 && /^\d{4}$/.test(connectSince)) {
      connectSince = `${connectSince}-01-01`;
    }

    const [row] = await this.db
      .insert(organizations)
      .values({
        name: data.name,
        email: data.email ?? '',
        phone: data.phone ?? '',
        address: data.address ?? '',
        website: data.website ?? '',
        assignedTo: data.assignedTo ?? 1,
        connectSince,
        city: data.city ?? '',
        description: data.description ?? '',
        adminEmail: data.adminEmail ?? '',
        adminPassword: data.adminPassword ?? '',
      })
      .returning();
    return this.toDomain(row!);
  }

  async update(id: number, data: UpdateOrganizationInput): Promise<Organization | null> {
    const [row] = await this.db
      .update(organizations)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(organizations.id, id), isNull(organizations.deletedAt)))
      .returning();
    return row ? this.toDomain(row) : null;
  }

  async softDelete(id: number): Promise<boolean> {
    const [row] = await this.db
      .update(organizations)
      .set({ deletedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning({ id: organizations.id });
    return !!row;
  }

  private toDomain(row: typeof organizations.$inferSelect): Organization {
    return {
      id: row.id,
      name: row.name,
      email: row.email ?? '',
      phone: row.phone ?? '',
      address: row.address ?? '',
      website: row.website ?? '',
      assignedTo: row.assignedTo ?? 1,
      connectSince: row.connectSince ?? '',
      city: row.city ?? '',
      description: row.description ?? '',
      adminEmail: row.adminEmail ?? '',
      adminPassword: row.adminPassword ?? '',
      deletedAt: row.deletedAt?.toISOString() ?? null,
      createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }
}
