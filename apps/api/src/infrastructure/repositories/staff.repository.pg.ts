import { eq, and, isNull, like, or, desc, sql } from 'drizzle-orm';
import { users, roles } from '@mmc/database';
import type { DbClient } from '@mmc/database';
import { Role } from '@mmc/types';
import type { StaffCategory } from '@mmc/types';
import type { CreateStaffInput, UpdateStaffInput } from '@mmc/validation';

export class StaffRepositoryPg {
  constructor(private readonly db: DbClient) {}

  private mapCategoryToRole(category: StaffCategory): Role {
    const mapping: Record<string, Role> = {
      'doctor': Role.Doctor,
      'employee': Role.Employee,
      'receptionist': Role.Receptionist,
      'clinicadmin': Role.Clinicadmin,
      'account': Role.Account,
    };
    return mapping[category] || Role.Employee;
  }

  async findAll(params: { category: StaffCategory; page: number; limit: number; search?: string }) {
    const role = this.mapCategoryToRole(params.category);
    const offset = (params.page - 1) * params.limit;

    const whereClause = [
      eq(users.type, role),
      isNull(users.deletedAt)
    ];

    if (params.search) {
      whereClause.push(or(
        like(users.name, `%${params.search}%`),
        like(users.email, `%${params.search}%`)
      )!);
    }

    const rows = await this.db
      .select()
      .from(users)
      .where(and(...whereClause))
      .limit(params.limit)
      .offset(offset)
      .orderBy(desc(users.id));

    // Simple count (in production this would be a separate query or using window function)
    const countResult = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(users)
      .where(and(...whereClause));

    const total = countResult[0]?.total ?? 0;

    return {
      data: rows.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone || '',
        type: r.type,
        isActive: r.isActive,
        createdAt: r.createdAt.toISOString()
      })),
      total,
    };
  }

  async findById(category: StaffCategory, id: number) {
    const role = this.mapCategoryToRole(category);
    const [row] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.type, role), isNull(users.deletedAt)))
      .limit(1);
    return row || null;
  }

  async create(data: CreateStaffInput) {
    const roleType = this.mapCategoryToRole(data.category);
    
    // Fetch corresponding role info from the database
    const [roleObj] = await this.db
      .select()
      .from(roles)
      .where(eq(roles.name, roleType))
      .limit(1);

    const [row] = await this.db
      .insert(users)
      .values({
        name: data.name,
        email: data.email || `${Date.now()}@placeholder.com`,
        password: data.password || 'temporary-password',
        type: roleType,
        roleId: roleObj?.id,
        roleName: roleObj?.displayName || roleObj?.name || roleType,
        phone: data.mobile,
        isActive: true,
      })
      .returning();
    return row;
  }

  async update(category: StaffCategory, id: number, data: UpdateStaffInput) {
    const roleType = this.mapCategoryToRole(category);
    
    // Fetch corresponding role info if type might have changed
    const [roleObj] = await this.db
      .select()
      .from(roles)
      .where(eq(roles.name, roleType))
      .limit(1);

    const [row] = await this.db
      .update(users)
      .set({ 
        ...data, 
        name: data.name,
        phone: data.mobile,
        roleId: roleObj?.id,
        roleName: roleObj?.displayName || roleObj?.name || roleType,
        updatedAt: new Date() 
      })
      .where(and(eq(users.id, id), eq(users.type, roleType)))
      .returning();
    return row;
  }

  async delete(category: StaffCategory, id: number) {
    const role = this.mapCategoryToRole(category);
    await this.db
      .update(users)
      .set({ deletedAt: new Date() })
  }
}
