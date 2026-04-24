import { eq, isNull, and, desc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { accounts, users } from '@mmc/database/schema';
import type { DbClient } from '@mmc/database';
import { Role, type Account, type CreateAccountInput, type UpdateAccountInput } from '@mmc/types';
import type { AccountRepository } from '../../domains/platform/ports/account.repository';
import { ConflictError } from '../../shared/errors';

export class AccountRepositoryPg implements AccountRepository {
  constructor(private readonly db: DbClient) {}

  async findAll(clinicId?: number): Promise<Account[]> {
    const conditions = [isNull(accounts.deletedAt)];
    if (clinicId) conditions.push(eq(accounts.clinicId, clinicId));

    const rows = await this.db
      .select()
      .from(accounts)
      .where(and(...conditions))
      .orderBy(desc(accounts.id));
    return rows.map(this.toDomain);
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
