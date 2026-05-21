import { eq, isNull, and, desc, or, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { accounts, users } from '@mmc/database/schema';
import type { DbClient } from '@mmc/database';
import { Role, type Account, type CreateAccountInput, type UpdateAccountInput } from '@mmc/types';
import type { AccountRepository } from '../../domains/platform/ports/account.repository.js';
import { ConflictError } from '../../shared/errors.js';

export class AccountRepositoryPg implements AccountRepository {
  constructor(private readonly db: DbClient) {}

  async findAll(clinicId?: number): Promise<Account[]> {
    if (clinicId) {
      // 1. Fetch organization name from organizations table
      const orgs = await this.db.execute(sql`
        SELECT name FROM organizations WHERE id = ${clinicId}
      `) as any[];
      
      const orgName = orgs[0]?.name;
      if (!orgName) return [];
      
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const schemaName = `tenant_${slug}`;

      // 2. Fetch public users mapped to this clinic
      const publicUsers = await this.db.execute(sql`
        SELECT id, name, email, type::text as designation, gender, mobile
        FROM users
        WHERE deleted_at IS NULL AND context_id = ${clinicId}
      `) as any[];

      const tenantAccounts: any[] = [];
      
      if (schemaName) {
        // A. Doctors
        try {
          const doctors = await this.db.execute(sql.raw(`
            SELECT id, name, email, 'Doctor' as designation, gender, mobile
            FROM ${schemaName}.doctors
            WHERE deleted_at IS NULL
          `)) as any[];
          tenantAccounts.push(...doctors);
        } catch (err) {}

        // B. Receptionists
        try {
          const receptionists = await this.db.execute(sql.raw(`
            SELECT id, name, email, 'Receptionist' as designation, gender, mobile
            FROM ${schemaName}.receptionists
            WHERE deleted_at IS NULL
          `)) as any[];
          tenantAccounts.push(...receptionists);
        } catch (err) {}

        // C. Employees
        try {
          const employees = await this.db.execute(sql.raw(`
            SELECT id, name, email, 'Employee' as designation, gender, mobile
            FROM ${schemaName}.employees
            WHERE deleted_at IS NULL
          `)) as any[];
          tenantAccounts.push(...employees);
        } catch (err) {}

        // D. Dispensaries
        try {
          const dispensaries = await this.db.execute(sql.raw(`
            SELECT id, name, email, 'Dispensary' as designation, 'Male' as gender, mobile
            FROM ${schemaName}.dispensaries
            WHERE deleted_at IS NULL
          `)) as any[];
          tenantAccounts.push(...dispensaries);
        } catch (err) {}

        // E. Patients (or case_datas)
        try {
          const patients = await this.db.execute(sql.raw(`
            SELECT id, CONCAT(first_name, ' ', middle_name, ' ', surname) as name, email, 'Patient' as designation, gender, mobile1 as mobile
            FROM ${schemaName}.patients
            WHERE deleted_at IS NULL
          `)) as any[];
          tenantAccounts.push(...patients.map(p => ({
            ...p,
            name: p.name.trim() || 'Patient'
          })));
        } catch (err) {
          try {
            const caseDatas = await this.db.execute(sql.raw(`
              SELECT id, name, email, 'Patient' as designation, gender, mobile
              FROM ${schemaName}.case_datas
              WHERE deleted_at IS NULL
            `)) as any[];
            tenantAccounts.push(...caseDatas);
          } catch (e2) {}
        }
      }

      // Merge and deduplicate
      const allAccounts = [
        ...publicUsers.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          mobile: u.mobile || '',
          mobile2: '',
          gender: u.gender || 'Male',
          city: '',
          address: '',
          about: '',
          designation: u.designation || 'Clinicadmin',
          dept: 1,
          clinicId: clinicId,
          deletedAt: null as string | null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
        ...tenantAccounts.map(t => ({
          id: t.id,
          name: t.name,
          email: t.email,
          mobile: t.mobile || '',
          mobile2: '',
          gender: t.gender || 'Male',
          city: '',
          address: '',
          about: '',
          designation: t.designation || 'Staff',
          dept: 1,
          clinicId: clinicId,
          deletedAt: null as string | null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }))
      ];

      const seen = new Set<string>();
      const uniqueAccounts: Account[] = [];
      for (const acc of allAccounts) {
        const key = `${acc.email?.toLowerCase() || ''}_${acc.designation?.toLowerCase() || ''}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueAccounts.push(acc);
        }
      }

      return uniqueAccounts;
    }

    // Default "All Registered Clinics" case (only Clinicadmin type in public users table)
    const query = this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        type: users.type,
        contextId: users.contextId,
        mobile: users.mobile,
        phone: users.phone,
        mobile2: users.mobile2,
        gender: users.gender,
        city: users.city,
        address: users.address,
        about: users.about,
        designation: users.designation,
        dept: users.dept,
        deletedAt: users.deletedAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(
        and(
          isNull(users.deletedAt),
          eq(users.type, Role.Clinicadmin)
        )
      );

    const rows = await query.orderBy(desc(users.id));

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      mobile: r.mobile || r.phone || '',
      mobile2: r.mobile2 || '',
      gender: r.gender || 'Male',
      city: r.city || '',
      address: r.address || '',
      about: r.about || '',
      designation: r.designation || r.type || '',
      dept: r.dept || 1,
      clinicId: r.contextId,
      deletedAt: r.deletedAt?.toISOString() ?? null,
      createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: r.updatedAt?.toISOString() ?? new Date().toISOString(),
    }));
  }

  async findById(id: number): Promise<Account | null> {
    const [row] = await this.db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, id), isNull(accounts.deletedAt)))
      .limit(1);
    return row ? this.toDomain(row) : null;
  }

  /**
   * Dual-write: inserts into accounts table AND mirrors to users table.
   * Wrapped in a transaction for data integrity.
   */
  async create(data: CreateAccountInput): Promise<Account> {
    // Check email uniqueness in users table (same as legacy)
    if (data.email) {
      const [existing] = await this.db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, data.email), isNull(users.deletedAt)))
        .limit(1);
      if (existing) throw new ConflictError('Email already exists');
    }

    const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : '';

    return await this.db.transaction(async (tx) => {
      // 1. Insert into accounts
      const [account] = await tx.insert(accounts).values({
        name:        data.name,
        email:       data.email       ?? '',
        password:    hashedPassword,
        mobile:      data.mobile      ?? '',
        mobile2:     data.mobile2     ?? '',
        gender:      data.gender      ?? 'Male',
        city:        data.city        ?? '',
        address:     data.address     ?? '',
        about:       data.about       ?? '',
        designation: data.designation ?? '',
        dept:        data.dept        ?? 1,
        clinicId:    data.clinicId    ?? null,
        // Legacy column fallbacks
        dateBirth:   '1990-01-01',
        dateLeft:    '1990-01-01',
        salaryCur:   0,
        packages:    '',
      }).returning();

      // 2. Mirror to users table (type='Account', context_id=accountId)
      await tx.insert(users).values({
        name:      data.name,
        email:     data.email ?? '',
        password:  hashedPassword,
        contextId: account!.id,
        type:      Role.Account,
        dept:      data.dept ?? 1,
      });

      return this.toDomain(account!);
    });
  }

  /**
   * Updates accounts table. If name changed, syncs to users table.
   */
  async update(id: number, data: UpdateAccountInput): Promise<Account | null> {
    return await this.db.transaction(async (tx) => {
      const [account] = await tx
        .update(accounts)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(accounts.id, id), isNull(accounts.deletedAt)))
        .returning();

      if (!account) return null;

      // Sync name to users mirror if name was updated
      if (data.name) {
        await tx
          .update(users)
          .set({ name: data.name })
          .where(and(eq(users.contextId, id), eq(users.type, Role.Account)));
      }

      return this.toDomain(account);
    });
  }

  /**
   * Soft-deletes from both accounts AND users (WHERE context_id=id AND type='Account').
   */
  async softDelete(id: number): Promise<boolean> {
    return await this.db.transaction(async (tx) => {
      const [deleted] = await tx
        .update(accounts)
        .set({ deletedAt: new Date() })
        .where(eq(accounts.id, id))
        .returning({ id: accounts.id });

      if (!deleted) return false;

      await tx
        .update(users)
        .set({ deletedAt: new Date() })
        .where(and(eq(users.contextId, id), eq(users.type, Role.Account)));

      return true;
    });
  }

  private toDomain(row: typeof accounts.$inferSelect): Account {
    return {
      id:          row.id,
      name:        row.name,
      email:       row.email        ?? '',
      mobile:      row.mobile       ?? '',
      mobile2:     row.mobile2      ?? '',
      gender:      row.gender       ?? 'Male',
      city:        row.city         ?? '',
      address:     row.address      ?? '',
      about:       row.about        ?? '',
      designation: row.designation  ?? '',
      dept:        row.dept         ?? 1,
      clinicId:    row.clinicId     ?? null,
      deletedAt:   row.deletedAt?.toISOString() ?? null,
      createdAt:   row.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt:   row.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }
}
