import { eq, like, or, sql, isNull, and } from 'drizzle-orm';
import { 
  caseDatasLegacy, 
  familygroupsLegacy, 
  doctorsLegacy, 
  religionLegacy, 
  occupationLegacy, 
  refrencetypeLegacy 
} from '@mmc/database/schema';
import type { DbClient } from '@mmc/database';
import type { Patient, PatientSummary, FamilyMember, PatientFormMeta } from '@mmc/types';
import type { PatientRepository } from '../../domains/patient/ports/patient.repository';
import type { CreatePatientInput, UpdatePatientInput, FamilyMemberInput } from '@mmc/validation';

const cd = caseDatasLegacy;
const fg = familygroupsLegacy;

/**
 * PostgreSQL adapter for PatientRepository port.
 * Queries the legacy `case_datas` table where all patient data lives.
 */
export class PatientRepositoryPg implements PatientRepository {
  constructor(private readonly db: DbClient) {}

  async findById(id: number): Promise<Patient | null> {
    const [row] = await this.db.select().from(cd).where(eq(cd.id, id)).limit(1);
    return row ? this.toDomain(row) : null;
  }

  async findByRegid(regid: number): Promise<Patient | null> {
    const [row] = await this.db.select().from(cd).where(eq(cd.regid, regid)).limit(1);
    return row ? this.toDomain(row) : null;
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ data: PatientSummary[]; total: number }> {
    const { page, limit, search } = params;
    const offset = (page - 1) * limit;

    const conditions = [isNull(cd.deletedAt)];

    if (search) {
      conditions.push(
        or(
          like(cd.firstName, `%${search}%`),
          like(cd.surname, `%${search}%`),
          like(cd.phone, `%${search}%`),
          like(cd.mobile1, `%${search}%`),
          sql`CAST(${cd.regid} AS TEXT) LIKE ${'%' + search + '%'}`,
        )!,
      );
    }

    const whereClause = and(...conditions);

    const [data, countRows] = await Promise.all([
      this.db
        .select()
        .from(cd)
        .where(whereClause)
        .orderBy(sql`${cd.id} DESC`)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(cd)
        .where(whereClause),
    ]);

    return {
      data: data.map(this.toSummary),
      total: Number(countRows[0]?.count ?? 0),
    };
  }

  async create(input: CreatePatientInput): Promise<Patient> {
    // Generate next regid
    const maxRows = await this.db
      .select({ maxRegid: sql<number>`coalesce(max(${cd.regid}), 1000)` })
      .from(cd);
    const nextRegid = Number(maxRows[0]?.maxRegid ?? 1000) + 1;

    const [row] = await this.db
      .insert(cd)
      .values({
        id: nextRegid, // legacy uses id = auto-increment but we need to set it
        regid: nextRegid,
        title: input.title || '',
        firstName: input.firstName,
        middleName: input.middleName || '',
        surname: input.surname,
        gender: input.gender || 'M',
        phone: input.phone || '',
        mobile1: input.mobile1 || '',
        mobile2: input.mobile2 || '',
        email: input.email || '',
        pin: input.pin || '',
        address: input.address || '',
        road: input.road || '',
        area: input.area || '',
        city: input.city || '',
        state: input.state || 'Punjab',
        altAddress: input.altAddress || '',
        religion: input.religion || '',
        occupation: input.occupation || '',
        status: input.maritalStatus || '',
        reference: input.referenceType || '',
        referedBy: input.referredBy || '',
        assitantDoctor: input.assistantDoctor || '',
        consultationFee: input.consultationFee || 500,
        courierOutstation: input.courierOutstation ? '1' : '0',
        dateOfBirth: input.dateOfBirth || null,
        coupon: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return this.toDomain(row!);
  }

  async update(regid: number, input: UpdatePatientInput): Promise<Patient | null> {
    const setValues: Record<string, unknown> = { updatedAt: new Date() };
    if (input.firstName !== undefined) setValues.firstName = input.firstName;
    if (input.surname !== undefined) setValues.surname = input.surname;
    if (input.gender !== undefined) setValues.gender = input.gender;
    if (input.phone !== undefined) setValues.phone = input.phone;
    if (input.mobile1 !== undefined) setValues.mobile1 = input.mobile1;
    if (input.mobile2 !== undefined) setValues.mobile2 = input.mobile2;
    if (input.email !== undefined) setValues.email = input.email;
    if (input.address !== undefined) setValues.address = input.address;
    if (input.city !== undefined) setValues.city = input.city;
    if (input.state !== undefined) setValues.state = input.state;
    if (input.religion !== undefined) setValues.religion = input.religion;
    if (input.occupation !== undefined) setValues.occupation = input.occupation;
    if (input.maritalStatus !== undefined) setValues.status = input.maritalStatus;
    if (input.assistantDoctor !== undefined) setValues.assitantDoctor = input.assistantDoctor;
    if (input.consultationFee !== undefined) setValues.consultationFee = input.consultationFee;

    const [row] = await this.db
      .update(cd)
      .set(setValues)
      .where(eq(cd.regid, regid))
      .returning();
    return row ? this.toDomain(row) : null;
  }

  async softDelete(regid: number): Promise<boolean> {
    const [row] = await this.db
      .update(cd)
      .set({ deletedAt: new Date() })
      .where(eq(cd.regid, regid))
      .returning();
    return !!row;
  }

  async lookup(query: string, limit = 20): Promise<PatientSummary[]> {
    const s = `%${query}%`;
    const rows = await this.db
      .select()
      .from(cd)
      .where(
        and(
          isNull(cd.deletedAt),
          or(
            like(cd.firstName, s),
            like(cd.surname, s),
            like(cd.phone, s),
            like(cd.mobile1, s),
            sql`CAST(${cd.regid} AS TEXT) LIKE ${s}`,
          ),
        ),
      )
      .limit(limit);
    return rows.map(this.toSummary);
  }

  async getFormMeta(): Promise<PatientFormMeta> {
    const [doctors, religions, occupations, references] = await Promise.all([
      this.db
        .select({ id: doctorsLegacy.id, name: doctorsLegacy.name, consultationFee: doctorsLegacy.consultationFee })
        .from(doctorsLegacy)
        .where(isNull(doctorsLegacy.deletedAt))
        .catch(err => {
          console.error('ERROR: Failed to fetch doctors. Check if doctors table exists in search_path.', err);
          return [];
        }),
      this.db.select().from(religionLegacy).catch(() => []),
      this.db.select().from(occupationLegacy).catch(() => []),
      this.db.select().from(refrencetypeLegacy).where(isNull(refrencetypeLegacy.deletedAt)).catch(() => []),
    ]);

    return {
      doctors: doctors.map(d => ({ id: d.id, name: d.name, consultationFee: d.consultationFee ? Number(d.consultationFee) : null })),
      religions: religions.map(r => r.religion).filter(Boolean) as string[],
      occupations: occupations.map(o => o.occupation).filter(Boolean) as string[],
      references: references.map(r => r.referencetype).filter(Boolean) as string[],
      statuses: ['Single', 'Married', 'Divorced', 'Widowed'],
      titles: ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Master', 'Baby'],
    };
  }

  // ─── Family Group ───

  async getFamilyGroups(params: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<{ data: any[]; total: number }> {
    const { page, limit, search } = params;
    const offset = (page - 1) * limit;

    // Derive family groups from the familygroups LINK table (which has actual data).
    // Each distinct regid in familygroups represents a patient who has linked family members.
    // We use drizzle's query builder (not raw SQL) to respect the tenant search_path.

    // Step 1: Get distinct regids that have family links
    const distinctHeads = await this.db
      .selectDistinct({ regid: fg.regid })
      .from(fg)
      .where(isNull(fg.deletedAt));

    if (distinctHeads.length === 0) {
      return { data: [], total: 0 };
    }

    const headRegids = distinctHeads.map(h => h.regid);

    // Step 2: For each head regid, get patient info and member count
    const results: any[] = [];
    for (const headRegid of headRegids) {
      // Get patient name from case_datas
      const [patient] = await this.db
        .select({
          firstName: cd.firstName,
          surname: cd.surname,
          phone: cd.mobile1,
        })
        .from(cd)
        .where(eq(cd.regid, headRegid))
        .limit(1);

      // Count family members for this regid
      const [countRow] = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(fg)
        .where(and(eq(fg.regid, headRegid), isNull(fg.deletedAt)));

      results.push({
        id: headRegid,
        regid: headRegid,
        name: patient?.firstName || '',
        surname: patient?.surname || '',
        phone: patient?.phone || null,
        totalMembers: Number(countRow?.count ?? 0),
      });
    }

    // Step 3: Apply search filter if provided
    let filtered = results;
    if (search) {
      const s = search.toLowerCase();
      filtered = results.filter(r =>
        r.name.toLowerCase().includes(s) ||
        r.surname.toLowerCase().includes(s) ||
        String(r.regid).includes(s)
      );
    }

    // Step 4: Sort and paginate
    filtered.sort((a, b) => b.regid - a.regid);
    const total = filtered.length;
    const paged = filtered.slice(offset, offset + limit);

    return { data: paged, total };
  }

  async getFamilyMembers(regid: number): Promise<FamilyMember[]> {
    const rows = await this.db
      .select({
        id: fg.id,
        regid: fg.regid,
        memberRegid: fg.memberRegid,
        relation: fg.relation,
        memberName: sql<string>`(SELECT CONCAT(COALESCE(first_name,''), ' ', COALESCE(surname,'')) FROM case_datas WHERE regid = ${fg.memberRegid} LIMIT 1)`,
        memberMobile: sql<string>`(SELECT COALESCE(mobile1, phone) FROM case_datas WHERE regid = ${fg.memberRegid} LIMIT 1)`,
      })
      .from(fg)
      .where(and(eq(fg.regid, regid), isNull(fg.deletedAt)));

    return rows.map(r => ({
      id: r.id,
      regid: r.regid,
      memberRegid: r.memberRegid,
      relation: r.relation || '',
      memberName: r.memberName?.trim() || null,
      memberMobile: r.memberMobile || null,
    }));
  }

  async addFamilyMember(regid: number, data: FamilyMemberInput): Promise<FamilyMember> {
    // Legacy DBs often have broken/missing sequences. Use manual max(id) + 1.
    const maxIdRes = await this.db.select({ maxId: sql<number>`MAX(${fg.id})` }).from(fg);
    const nextId = (maxIdRes[0]?.maxId ?? 0) + 1;

    const [row] = await this.db
      .insert(fg)
      .values({
        id: nextId,
        regid,
        memberRegid: data.memberRegid,
        relation: data.relation,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return {
      id: row!.id,
      regid: row!.regid,
      memberRegid: row!.memberRegid,
      relation: row!.relation || '',
      memberName: null,
      memberMobile: null,
    };
  }

  async removeFamilyMember(id: number): Promise<boolean> {
    const [row] = await this.db
      .update(fg)
      .set({ deletedAt: new Date() })
      .where(eq(fg.id, id))
      .returning();
    return !!row;
  }

  // ─── Mappers ───

  private toDomain(row: typeof cd.$inferSelect): Patient {
    return {
      id: row.id,
      regid: row.regid || 0,
      tenantId: '',
      title: row.title || null,
      firstName: row.firstName || '',
      middleName: row.middleName || null,
      surname: row.surname || '',
      gender: (row.gender as Patient['gender']) || 'Other',
      dateOfBirth: row.dob ? new Date(row.dob) : (row.dateOfBirth ? new Date(row.dateOfBirth) : null),
      age: null,
      phone: row.phone || null,
      mobile1: row.mobile1 || null,
      mobile2: row.mobile2 || null,
      email: row.email || null,
      pin: row.pin || null,
      address: row.address || null,
      road: row.road || null,
      area: row.area || null,
      city: row.city || null,
      state: row.state || null,
      country: null,
      altAddress: row.altAddress || null,
      religion: row.religion || null,
      occupation: row.occupation || null,
      maritalStatus: row.status || null,
      bloodGroup: null,
      referenceType: row.reference || null,
      referredBy: row.referedBy || null,
      assistantDoctor: row.assitantDoctor || null,
      consultationFee: row.consultationFee || null,
      courierOutstation: row.courierOutstation === '1',
      createdAt: row.createdAt || new Date(),
      updatedAt: row.updatedAt || new Date(),
      deletedAt: row.deletedAt || null,
    };
  }

  private toSummary(row: typeof cd.$inferSelect): PatientSummary {
    return {
      regid: row.regid || 0,
      fullName: `${row.firstName || ''} ${row.surname || ''}`.trim(),
      gender: row.gender || '',
      age: null,
      phone: row.mobile1 || row.phone || null,
      city: row.city || null,
      lastVisit: null,
      totalVisits: 0,
      createdAt: row.createdAt || new Date(),
    };
  }
}
