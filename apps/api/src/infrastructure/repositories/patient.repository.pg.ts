import { eq, like, or, sql, desc, asc, isNull } from 'drizzle-orm';
import { patients } from '@mmc/database/schema';
import type { DbClient } from '@mmc/database';
import type { Patient, PatientSummary } from '@mmc/types';
import type { PatientRepository } from '../../domains/patient/ports/patient.repository';
import type { CreatePatientInput, UpdatePatientInput } from '@mmc/validation';

/**
 * PostgreSQL adapter for PatientRepository port.
 * Uses Drizzle ORM with schema-per-tenant (search_path set at connection level).
 */
export class PatientRepositoryPg implements PatientRepository {
  constructor(private readonly db: DbClient) {}

  async findById(id: number): Promise<Patient | null> {
    const [row] = await this.db.select().from(patients).where(eq(patients.id, id)).limit(1);
    return row ? this.toDomain(row) : null;
  }

  async findByRegid(regid: number): Promise<Patient | null> {
    const [row] = await this.db.select().from(patients).where(eq(patients.regid, regid)).limit(1);
    return row ? this.toDomain(row) : null;
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ data: PatientSummary[]; total: number }> {
    const { page, limit, search, sortBy = 'id', sortOrder = 'desc' } = params;
    const offset = (page - 1) * limit;

    let query = this.db.select().from(patients).where(isNull(patients.deletedAt));

    if (search) {
      query = query.where(
        or(
          like(patients.firstName, `%${search}%`),
          like(patients.surname, `%${search}%`),
          like(patients.phone, `%${search}%`),
        )!,
      ) as typeof query;
    }

    const [data, [{ count }]] = await Promise.all([
      query.limit(limit).offset(offset),
      this.db.select({ count: sql<number>`count(*)` }).from(patients).where(isNull(patients.deletedAt)),
    ]);

    return {
      data: data.map(this.toSummary),
      total: Number(count),
    };
  }

  async create(input: CreatePatientInput): Promise<Patient> {
    // Generate next regid
    const [{ maxRegid }] = await this.db
      .select({ maxRegid: sql<number>`coalesce(max(regid), 1000000)` })
      .from(patients);
    const nextRegid = Number(maxRegid) + 1;

    const [row] = await this.db
      .insert(patients)
      .values({
        regid: nextRegid,
        firstName: input.firstName,
        surname: input.surname,
        gender: input.gender,
        dateOfBirth: input.dateOfBirth,
        phone: input.phone,
        email: input.email,
        address: input.address,
        city: input.city,
        state: input.state,
        bloodGroup: input.bloodGroup,
        referenceType: input.referenceType,
      })
      .returning();

    return this.toDomain(row!);
  }

  async update(regid: number, input: UpdatePatientInput): Promise<Patient | null> {
    const [row] = await this.db
      .update(patients)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(patients.regid, regid))
      .returning();
    return row ? this.toDomain(row) : null;
  }

  async softDelete(regid: number): Promise<boolean> {
    const [row] = await this.db
      .update(patients)
      .set({ deletedAt: new Date() })
      .where(eq(patients.regid, regid))
      .returning();
    return !!row;
  }

  async lookup(query: string, limit = 10): Promise<PatientSummary[]> {
    const rows = await this.db
      .select()
      .from(patients)
      .where(
        or(
          like(patients.firstName, `%${query}%`),
          like(patients.surname, `%${query}%`),
          like(patients.phone, `%${query}%`),
        )!,
      )
      .limit(limit);
    return rows.map(this.toSummary);
  }

  private toDomain(row: typeof patients.$inferSelect): Patient {
    return {
      id: row.id,
      regid: row.regid,
      tenantId: '',
      firstName: row.firstName || '',
      surname: row.surname || '',
      gender: (row.gender as Patient['gender']) || 'Other',
      dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
      age: row.age,
      phone: row.phone,
      email: row.email,
      address: row.address,
      city: row.city,
      state: row.state,
      bloodGroup: row.bloodGroup,
      referenceType: row.referenceType,
      createdAt: row.createdAt || new Date(),
      updatedAt: row.updatedAt || new Date(),
      deletedAt: row.deletedAt || null,
    };
  }

  private toSummary(row: typeof patients.$inferSelect): PatientSummary {
    return {
      regid: row.regid,
      fullName: `${row.firstName || ''} ${row.surname || ''}`.trim(),
      gender: row.gender || '',
      age: row.age,
      phone: row.phone,
      lastVisit: null,
      totalVisits: 0,
    };
  }
}
