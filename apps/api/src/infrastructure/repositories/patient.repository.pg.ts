import { and, eq, like, or, sql, isNull } from 'drizzle-orm';
import { 
  patients, 
  familygroupsLegacy, 
  doctorsLegacy, 
  religionLegacy, 
  occupationLegacy, 
  refrencetypeLegacy 
} from '@mmc/database/schema';
import type { DbClient } from '@mmc/database';
import type { 
  Patient, 
  PatientSummary, 
  FamilyMember, 
  PatientFormMeta, 
  FamilyGroupSummary 
} from '@mmc/types';
import type { PatientRepository } from '../../domains/patient/ports/patient.repository';
import type { 
  CreatePatientInput, 
  UpdatePatientInput, 
  FamilyMemberInput 
} from '@mmc/validation';

/**
 * PostgreSQL adapter for PatientRepository port.
 * Integrated advanced Patient demographics and Family Group management from 'shiva' branch.
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
    const { page, limit, search } = params;
    const offset = (page - 1) * limit;

    const conditions = [isNull(patients.deletedAt)];

    if (search) {
      const s = `%${search}%`;
      conditions.push(
        or(
          like(patients.firstName, s),
          like(patients.surname, s),
          like(patients.phone, s),
          like(patients.mobile1, s),
          sql`CAST(${patients.regid} AS TEXT) LIKE ${s}`,
        )!
      );
    }

    const whereClause = and(...conditions);

    const [data, countRows] = await Promise.all([
      this.db
        .select()
        .from(patients)
        .where(whereClause)
        .orderBy(sql`${patients.id} DESC`)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(patients)
        .where(whereClause),
    ]);

    return {
      data: data.map(row => this.toSummary(row)),
      total: Number(countRows[0]?.count ?? 0),
    };
  }

  async create(input: CreatePatientInput): Promise<Patient> {
    // Generate next regid (legacy compatibility)
    const maxRows = await this.db
      .select({ maxRegid: sql<number>`coalesce(max(${patients.regid}), 1000)` })
      .from(patients);
    const nextRegid = Number(maxRows[0]?.maxRegid || 1000) + 1;

    const [row] = await this.db
      .insert(patients)
      .values({
        id: nextRegid, // Legacy uses ID as primary key manually
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
        state: input.state || '',
        altAddress: input.altAddress || '',
        religion: input.religion || '',
        occupation: input.occupation || '',
        // 'status' column = marital status in the legacy table
        status: (input as any).maritalStatus || '',
        // 'reference' = referenceType text (actual column name is 'reference', NOT 'reference_type')
        reference: input.referenceType || '',
        referedBy: (input as any).referredBy || '',
        assitantDoctor: (input as any).assistantDoctor || '',
        consultationFee: (input as any).consultationFee || 0,
        courierOutstation: (input as any).courierOutstation ? '1' : '0',
        coupon: '', // Required by legacy database
        dateOfBirth: input.dateOfBirth ? String(input.dateOfBirth) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .returning();

    return this.toDomain(row!);
  }

  async update(regid: number, input: UpdatePatientInput): Promise<Patient | null> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (input.firstName    !== undefined) updateData.firstName    = input.firstName;
    if (input.middleName   !== undefined) updateData.middleName   = input.middleName;
    if (input.surname      !== undefined) updateData.surname      = input.surname;
    if (input.gender       !== undefined) updateData.gender       = input.gender;
    if (input.title        !== undefined) updateData.title        = input.title;
    if (input.phone        !== undefined) updateData.phone        = input.phone;
    if (input.mobile1      !== undefined) updateData.mobile1      = input.mobile1;
    if (input.mobile2      !== undefined) updateData.mobile2      = input.mobile2;
    if (input.email        !== undefined) updateData.email        = input.email;
    if (input.address      !== undefined) updateData.address      = input.address;
    if (input.road         !== undefined) updateData.road         = input.road;
    if (input.area         !== undefined) updateData.area         = input.area;
    if (input.city         !== undefined) updateData.city         = input.city;
    if (input.state        !== undefined) updateData.state        = input.state;
    if (input.pin          !== undefined) updateData.pin          = input.pin;
    if (input.altAddress   !== undefined) updateData.altAddress   = input.altAddress;
    if (input.religion     !== undefined) updateData.religion     = input.religion;
    if (input.occupation   !== undefined) updateData.occupation   = input.occupation;
    if (input.dateOfBirth  !== undefined) updateData.dateOfBirth  = input.dateOfBirth ? String(input.dateOfBirth) : null;
    if (input.referenceType !== undefined) updateData.reference   = input.referenceType; // actual col = 'reference'
    if ((input as any).maritalStatus !== undefined) updateData.status   = (input as any).maritalStatus;
    if ((input as any).referredBy    !== undefined) updateData.referedBy = (input as any).referredBy;
    if ((input as any).assistantDoctor !== undefined) updateData.assitantDoctor = (input as any).assistantDoctor;
    if ((input as any).consultationFee !== undefined) updateData.consultationFee = (input as any).consultationFee;

    const [row] = await this.db
      .update(patients)
      .set(updateData as any)
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

  async lookup(query: string, limit = 20): Promise<PatientSummary[]> {
    const s = `%${query}%`;
    const rows = await this.db
      .select()
      .from(patients)
      .where(
        and(
          isNull(patients.deletedAt),
          or(
            like(patients.firstName, s),
            like(patients.surname, s),
            like(patients.phone, s),
            like(patients.mobile1, s),
            sql`CAST(${patients.regid} AS TEXT) LIKE ${s}`,
          )
        )
      )
      .limit(limit);
    return rows.map(row => this.toSummary(row));
  }

  async findBirthdays(mmdd: string): Promise<PatientSummary[]> {
    const rows = await this.db
      .select()
      .from(patients)
      .where(
        and(
          isNull(patients.deletedAt),
          sql`to_char(${patients.dob}::date, 'MM-DD') = ${mmdd}`
        )
      );
    return rows.map(row => this.toSummary(row));
  }

  async getFormMeta(): Promise<PatientFormMeta> {
    const [doctors, religions, occupations, references] = await Promise.all([
      this.db
        .select({ id: doctorsLegacy.id, name: doctorsLegacy.name, consultationFee: doctorsLegacy.consultationFee })
        .from(doctorsLegacy)
        .where(isNull(doctorsLegacy.deletedAt))
        .catch(() => []),
      this.db.select().from(religionLegacy).catch(() => []),
      this.db.select().from(occupationLegacy).catch(() => []),
      this.db.select().from(refrencetypeLegacy).catch(() => []),
    ]);

    return {
      doctors: doctors.map(d => ({ 
        id: d.id, 
        name: d.name, 
        consultationFee: d.consultationFee ? Number(d.consultationFee) : null 
      })),
      religions: religions.map((r: any) => r.religion).filter(Boolean),
      occupations: occupations.map((o: any) => o.occupation).filter(Boolean),
      references: references.map((r: any) => r.referencetype).filter(Boolean),
      statuses: ['Single', 'Married', 'Divorced', 'Widowed'],
      titles: ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Master', 'Baby'],
    };
  }

  // ─── Family Group ───

  async getFamilyGroups(params: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<{ data: FamilyGroupSummary[]; total: number }> {
    const { page, limit, search } = params;
    const offset = (page - 1) * limit;
    const fg = familygroupsLegacy;

    const distinctHeads = await this.db
      .selectDistinct({ regid: fg.regid })
      .from(fg)
      .where(isNull(fg.deletedAt));

    if (distinctHeads.length === 0) return { data: [], total: 0 };

    const headRegids = distinctHeads.map(h => h.regid);
    const results: FamilyGroupSummary[] = [];

    for (const headRegid of headRegids) {
      if (!headRegid) continue;
      const [patient] = await this.db
        .select({ firstName: patients.firstName, surname: patients.surname })
        .from(patients)
        .where(eq(patients.regid, headRegid))
        .limit(1);

      const [countRow] = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(fg)
        .where(and(eq(fg.regid, headRegid), isNull(fg.deletedAt)));

      results.push({
        id: headRegid,
        regid: headRegid,
        familyRegid: headRegid,
        name: patient?.firstName || '',
        surname: patient?.surname || '',
        totalMembers: Number(countRow?.count ?? 0),
      });
    }

    let filtered = results;
    if (search) {
      const s = search.toLowerCase();
      filtered = results.filter(r => 
        r.name.toLowerCase().includes(s) || 
        r.surname.toLowerCase().includes(s) || 
        String(r.regid).includes(s)
      );
    }

    filtered.sort((a, b) => b.regid - a.regid);
    return {
      data: filtered.slice(offset, offset + limit),
      total: filtered.length
    };
  }

  async getFamilyMembers(regid: number): Promise<FamilyMember[]> {
    const fg = familygroupsLegacy;
    const rows = await this.db
      .select({
        id: fg.id,
        regid: fg.regid,
        memberRegid: fg.memberRegid,
        relation: fg.relation,
      })
      .from(fg)
      .where(and(eq(fg.regid, regid), isNull(fg.deletedAt)));

    return Promise.all(rows.map(async r => {
      const [p] = await this.db
        .select({ firstName: patients.firstName, surname: patients.surname, phone: patients.phone })
        .from(patients)
        .where(eq(patients.regid, r.memberRegid!))
        .limit(1);

      return {
        id: r.id,
        regid: r.regid!,
        memberRegid: r.memberRegid!,
        relation: r.relation || '',
        memberName: p ? `${p.firstName} ${p.surname}`.trim() : null,
        memberMobile: p?.phone || null,
      };
    }));
  }

  async addFamilyMember(regid: number, data: FamilyMemberInput): Promise<FamilyMember> {
    const fg = familygroupsLegacy;
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

    // Resolve member name and mobile for the returned object
    const [p] = await this.db
      .select({ firstName: patients.firstName, surname: patients.surname, phone: patients.phone })
      .from(patients)
      .where(eq(patients.regid, data.memberRegid))
      .limit(1);

    return {
      id: row!.id,
      regid: row!.regid!,
      memberRegid: row!.memberRegid!,
      relation: row!.relation || '',
      memberName: p ? `${p.firstName} ${p.surname}`.trim() : null,
      memberMobile: p?.phone || null,
    };
  }

  async removeFamilyMember(id: number): Promise<boolean> {
    const [row] = await this.db
      .update(familygroupsLegacy)
      .set({ deletedAt: new Date() })
      .where(eq(familygroupsLegacy.id, id))
      .returning();
    return !!row;
  }

  private toDomain(row: any): Patient {
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
      age: row.age || null,
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
      bloodGroup: row.bloodGroup || null,
      // 'reference' is the actual DB column; domain calls it 'referenceType'
      referenceType: row.reference || null,
      referredBy: row.referedBy || null,
      assistantDoctor: row.assitantDoctor || null,
      consultationFee: row.consultationFee ? Number(row.consultationFee) : null,
      courierOutstation: row.courierOutstation === '1',
      createdAt: row.createdAt || new Date(),
      updatedAt: row.updatedAt || new Date(),
      deletedAt: row.deletedAt || null,
    };
  }

  private toSummary(row: any): PatientSummary {
    return {
      regid: row.regid || 0,
      fullName: `${row.firstName || ''} ${row.surname || ''}`.trim(),
      gender: row.gender || '',
      age: row.age || null,
      phone: row.mobile1 || row.phone || null,
      mobile1: row.mobile1 || null,
      dob: row.dob || row.dateOfBirth || null,
      city: row.city || null,
      lastVisit: null,
      totalVisits: 0,
      createdAt: row.createdAt || new Date(),
    };
  }
}
