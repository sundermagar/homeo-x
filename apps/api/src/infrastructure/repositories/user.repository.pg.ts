import { sql, eq } from 'drizzle-orm';
import type { User } from '@mmc/types';
import { Role } from '@mmc/types';
import type { DbClient } from '@mmc/database';
import * as schema from '@mmc/database';
import type { UserRepository } from '../../domains/auth/ports/user.repository';

export class UserRepositoryPG implements UserRepository {
  constructor(private readonly db: DbClient) {}

  private mapLegacyRole(type: string): Role {
    const mapping: Record<string, Role> = {
      // Legacy ALL_CAPS strings (from old PHP app)
      'SUPER_ADMIN': Role.Admin,
      'CLINIC_ADMIN': Role.Clinicadmin,
      'CLICNIC_ADMIN': Role.Clinicadmin,
      'DOCTOR': Role.Doctor,
      'RECEPTION': Role.Receptionist,
      'DISPENSARY_MANAGER': Role.Dispensary,
      'ACCOUNT_MANAGER': Role.Account,
      'PATIENT': Role.Patient,
      // Modern PascalCase Role enum values (stored by StaffRepositoryPg)
      'SuperAdmin': Role.SuperAdmin,
      'Admin': Role.Admin,
      'Clinicadmin': Role.Clinicadmin,
      'Doctor': Role.Doctor,
      'Receptionist': Role.Receptionist,
      'Employee': Role.Employee,
      'Account': Role.Account,
      'Dispensary': Role.Dispensary,
      'Patient': Role.Patient,
    };
    return mapping[type] || (type as Role);
  }

  private rowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name || '',
      type: this.mapLegacyRole(row.type || 'PATIENT'),
      contextId: row.context_id ?? 0,
      roleId: row.role_id ?? 0,
      roleName: row.role_name ?? '',
      clinicName: row.clinic_name ?? undefined,
      phone: row.phone ?? row.mobile ?? null,
      isActive: row.is_active !== false,
      createdAt: row.created_at || new Date(),
      updatedAt: row.updated_at || new Date(),
    };
  }

  async findById(id: number): Promise<User | null> {
    const rows = await this.db.execute(
      sql`SELECT id, email, name, type, context_id, mobile, created_at, updated_at
          FROM public.users WHERE id = ${id} AND deleted_at IS NULL LIMIT 1`
    );
    const row = (rows as any[])[0];
    return row ? this.rowToUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const rows = await this.db.execute(
      sql`SELECT u.*, o.name as clinic_name 
          FROM public.users u 
          LEFT JOIN public.organizations o ON o.id = u.context_id 
          WHERE u.email = ${email} AND u.deleted_at IS NULL 
          LIMIT 1`
    );
    const row = (rows as any[])[0];
    return row ? this.rowToUser(row) : null;
  }

  async getUserPassword(email: string): Promise<string | null> {
    const rows = await this.db.execute(
      sql`SELECT password FROM public.users WHERE email = ${email} AND deleted_at IS NULL LIMIT 1`
    );
    const row = (rows as any[])[0] as any;
    return row?.password || null;
  }

  async updatePassword(userId: number, passwordHash: string): Promise<void> {
    await this.db.execute(
      sql`UPDATE public.users SET password = ${passwordHash}, updated_at = NOW() WHERE id = ${userId}`
    );
  }

  async getUserPermissions(roleId: number): Promise<string[]> {
    if (!roleId) return [];
    try {
      const rows = await this.db
        .select({ name: schema.permissions.name })
        .from(schema.permissions)
        .innerJoin(schema.permissionRole, eq(schema.permissionRole.permissionId, schema.permissions.id))
        .where(eq(schema.permissionRole.roleId, roleId));
      return rows.map(r => r.name || '').filter(Boolean);
    } catch {
      return [];
    }
  }

  async findPractitioners(): Promise<User[]> {
    const rows = await this.db.execute(
      sql`SELECT id, email, name, type, context_id, mobile, created_at, updated_at
          FROM public.users WHERE type = 'Doctor' AND deleted_at IS NULL`
    );
    return (rows as any[]).map(row => this.rowToUser(row));
  }
}
