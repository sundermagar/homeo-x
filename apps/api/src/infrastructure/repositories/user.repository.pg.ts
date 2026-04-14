import { eq, and, isNull } from 'drizzle-orm';
import type { User, AuthTokenPayload } from '@mmc/types';
import { Role } from '@mmc/types';
import type { DbClient } from '@mmc/database';
import * as schema from '@mmc/database';
import type { UserRepository } from '../../domains/auth/ports/user.repository';

export class UserRepositoryPG implements UserRepository {
  constructor(private readonly db: DbClient) {}

  private mapLegacyRole(type: string): Role {
    const mapping: Record<string, Role> = {
      'SUPER_ADMIN': Role.Admin,
      'CLINIC_ADMIN': Role.Clinicadmin,
      'CLICNIC_ADMIN': Role.Clinicadmin,
      'DOCTOR': Role.Doctor,
      'RECEPTION': Role.Receptionist,
      'DISPENSARY_MANAGER': Role.Dispensary,
      'ACCOUNT_MANAGER': Role.Account,
      'PATIENT': Role.Patient,
    };
    return mapping[type] || (type as Role);
  }

  async findById(id: number): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, id), isNull(schema.users.deletedAt)))
      .limit(1);

    if (!row) return null;

    return {
      id: row.id,
      email: row.email,
      name: row.name || '',
      type: this.mapLegacyRole(row.type || 'PATIENT'),
      contextId: row.contextId ?? 0,
      roleId: row.roleId ?? 0,
      roleName: row.roleName ?? '',
      phone: row.phone,
      isActive: row.isActive ?? true,
      createdAt: row.createdAt || new Date(),
      updatedAt: row.updatedAt || new Date(),
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.email, email), isNull(schema.users.deletedAt)))
      .limit(1);

    if (!row) return null;

    return {
      id: row.id,
      email: row.email,
      name: row.name || '',
      type: this.mapLegacyRole(row.type || 'PATIENT'),
      contextId: row.contextId ?? 0,
      roleId: row.roleId ?? 0,
      roleName: row.roleName ?? '',
      phone: row.phone,
      isActive: row.isActive ?? true,
      createdAt: row.createdAt || new Date(),
      updatedAt: row.updatedAt || new Date(),
    };
  }

  async getUserPassword(email: string): Promise<string | null> {
    const [row] = await this.db
      .select({ password: schema.users.password })
      .from(schema.users)
      .where(and(eq(schema.users.email, email), isNull(schema.users.deletedAt)))
      .limit(1);

    return row?.password || null;
  }

  async updatePassword(userId: number, passwordHash: string): Promise<void> {
    await this.db
      .update(schema.users)
      .set({ password: passwordHash, updatedAt: new Date() })
      .where(eq(schema.users.id, userId));
  }

  async getUserPermissions(roleId: number): Promise<string[]> {
    if (!roleId) return [];

    const rows = await this.db
      .select({ name: schema.permissions.name })
      .from(schema.permissions)
      .innerJoin(schema.permissionRole, eq(schema.permissionRole.permissionId, schema.permissions.id))
      .where(eq(schema.permissionRole.roleId, roleId));

    return rows.map(r => r.name || '').filter(Boolean);
  }

  async findPractitioners(): Promise<User[]> {
    const rows = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.type, 'DOCTOR'), isNull(schema.users.deletedAt), eq(schema.users.isActive, true)));

    return rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name || '',
      type: this.mapLegacyRole(row.type || 'PATIENT'),
      contextId: row.contextId ?? 0,
      roleId: row.roleId ?? 0,
      roleName: row.roleName ?? '',
      phone: row.phone,
      isActive: row.isActive ?? true,
      createdAt: row.createdAt || new Date(),
      updatedAt: row.updatedAt || new Date(),
    }));
  }
}
