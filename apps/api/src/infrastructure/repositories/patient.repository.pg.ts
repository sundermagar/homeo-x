import { and, eq, isNull, like, or, sql } from 'drizzle-orm';
import {
  patients,
  familygroupsLegacy,
  doctorsLegacy,
  religionLegacy,
  occupationLegacy,
  refrencetypeLegacy,
  appointments,
  referralSources,
  users
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
  constructor(private readonly db: DbClient) { }

  async findById(id: number): Promise<Patient | null> {
    const [row] = await this.db
      .select()
      .from(patients)
      .where(
        and(
          eq(patients.id, id),
          sql`(deleted_at IS NULL OR deleted_at::text = '')`
        )
      )
      .limit(1);
    return row ? this.toDomain(row) : null;
  }

  async findByRegid(regid: number): Promise<Patient | null> {
    const [row] = await this.db
      .select()
      .from(patients)
      .where(
        and(
          eq(patients.regid, regid),
          sql`(deleted_at IS NULL OR deleted_at::text = '')`
        )
      )
      .limit(1);
    return row ? this.toDomain(row) : null;
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    doctorId?: number;
    clinicId?: number;
  }): Promise<{ data: PatientSummary[]; total: number }> {
    const { page, limit, search, doctorId, clinicId, sortBy, sortOrder } = params;
    const offset = (page - 1) * limit;

    const conditions = [sql`(${patients.deletedAt} IS NULL OR ${patients.deletedAt}::text = '')` as any];

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

    if (doctorId) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${appointments} 
          WHERE ${appointments.patientId} = ${patients.id} 
            AND ${appointments.doctorId} = ${doctorId}
            AND (${appointments.deletedAt} IS NULL OR ${appointments.deletedAt}::text = '')
        )`
      );
    }

    if (clinicId) {
      conditions.push(eq(patients.clinicId, clinicId));
    }

    const whereClause = and(...conditions);

    // Sorting logic
    let orderBy: any = sql`${patients.id} DESC`; // default
    if (sortBy === 'name') {
      orderBy = sortOrder === 'desc' ? sql`${patients.firstName} DESC` : sql`${patients.firstName} ASC`;
    } else if (sortBy === 'newest') {
      orderBy = sql`${patients.id} DESC`;
    } else if (sortBy === 'oldest') {
      orderBy = sql`${patients.id} ASC`;
    } else if (sortBy) {
      // Direct column sort if valid
      const col = (patients as any)[sortBy];
      if (col) {
        orderBy = sortOrder === 'desc' ? sql`${col} DESC` : sql`${col} ASC`;
      }
    }

    const [data, countRows] = await Promise.all([
      this.db
        .select({
          patient: patients,
          doctorName: users.name
        })
        .from(patients)
        .leftJoin(users, eq(patients.assitantDoctor, sql`CAST(${users.id} AS TEXT)`))
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(patients)
        .where(whereClause),
    ]);

    return {
      data: data.map(row => {
        // Handle the joined structure
        const summary = this.toSummary(row.patient || row);
        if (row.doctorName) {
          summary.doctorName = row.doctorName;
        }
        return summary;
      }),
      total: Number(countRows[0]?.count ?? 0),
    };
  }

  async create(input: CreatePatientInput & { clinicId?: number }): Promise<Patient> {
    // Generate next regid (legacy compatibility)
    const maxRows = await this.db
      .select({ maxRegid: sql<number>`coalesce(max(${patients.regid}), 1000)` })
      .from(patients);
    const nextRegid = Number(maxRows[0]?.maxRegid || 1000) + 1;

    const patientData: any = {
      id: nextRegid,
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
      city: input.city || '',
      state: input.state || '',
      dateOfBirth: input.dateOfBirth || null,
      dob: input.dateOfBirth || null,
    };

    // Only add columns if they exist in the schema to avoid "column does not exist" errors
    if ((patients as any).road) patientData.road = input.road || '';
    if ((patients as any).area) patientData.area = input.area || '';
    if ((patients as any).altAddress) patientData.altAddress = input.altAddress || '';
    if ((patients as any).religion) patientData.religion = input.religion || '';
    if ((patients as any).occupation) patientData.occupation = input.occupation || '';
    if ((patients as any).bloodGroup) patientData.bloodGroup = input.bloodGroup || '';

    // Handle reference sources
    const refId = String((input as any).referenceTypeId || '');
    if (refId.startsWith('rt_')) {
      (patientData as any).referenceTypeId = Number(refId.replace('rt_', ''));
    } else {
      (patientData as any).referenceTypeId = null;
    }
    patientData.reference = input.referenceType || '';

    if ((patients as any).assitantDoctor) patientData.assitantDoctor = (input as any).assistantDoctor || '';
    if ((patients as any).consultationFee) patientData.consultationFee = (input as any).consultationFee || 0;
    if ((patients as any).courierOutstation) patientData.courierOutstation = input.courierOutstation ? '1' : '0';
    if ((patients as any).referedBy) patientData.referedBy = (input as any).referredBy || '';
    if ((patients as any).status) patientData.status = (input as any).maritalStatus || '';

    // Try inserting WITH clinic_id first; if the column doesn't exist in the actual
    // database (legacy schema not yet migrated), retry without it.
    try {
      const [row] = await this.db
        .insert(patients)
        .values({ ...patientData, clinicId: input.clinicId || null })
        .returning();
      return this.toDomain(row!);
    } catch (err: any) {
      // If the error is specifically about clinic_id column not existing,
      // fall back to inserting without it so patient creation still works.
      if (err?.message?.includes('clinic_id') && err?.message?.includes('does not exist')) {
        console.warn('[PatientRepo] clinic_id column missing in case_datas — inserting without it. Run migration to add the column.');
        const [row] = await this.db
          .insert(patients)
          .values(patientData)
          .returning();
        return this.toDomain(row!);
      }
      throw err;
    }
  }


  async update(regid: number, input: UpdatePatientInput): Promise<Patient | null> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (input.firstName !== undefined) updateData.firstName = input.firstName;
    if (input.middleName !== undefined) updateData.middleName = input.middleName;
    if (input.surname !== undefined) updateData.surname = input.surname;
    if (input.gender !== undefined) updateData.gender = input.gender;
    if (input.title !== undefined) updateData.title = input.title;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.mobile1 !== undefined) updateData.mobile1 = input.mobile1;
    if (input.mobile2 !== undefined) updateData.mobile2 = input.mobile2;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.road !== undefined) updateData.road = input.road;
    if (input.area !== undefined) updateData.area = input.area;
    if (input.city !== undefined) updateData.city = input.city;
    if (input.state !== undefined) updateData.state = input.state;
    if (input.pin !== undefined) updateData.pin = input.pin;
    if (input.altAddress !== undefined) updateData.altAddress = input.altAddress;
    if (input.religion !== undefined) updateData.religion = input.religion;
    if (input.occupation !== undefined) updateData.occupation = input.occupation;
    if (input.dateOfBirth !== undefined) {
      updateData.dateOfBirth = input.dateOfBirth || null;
      updateData.dob = input.dateOfBirth || null;
    }
    if ((input as any).referenceTypeId !== undefined) {
      const refId = String((input as any).referenceTypeId || '');
      if (refId.startsWith('rt_')) {
        updateData.referenceTypeId = Number(refId.replace('rt_', ''));
      } else {
        updateData.referenceTypeId = null;
      }
    }
    if (input.referenceType !== undefined) updateData.reference = input.referenceType;
    if ((input as any).maritalStatus !== undefined) updateData.status = (input as any).maritalStatus;
    if ((input as any).referredBy !== undefined) updateData.referedBy = (input as any).referredBy;
    if ((input as any).assistantDoctor !== undefined) updateData.assitantDoctor = (input as any).assistantDoctor;
    if ((input as any).consultationFee !== undefined) updateData.consultationFee = (input as any).consultationFee;

    const [row] = await this.db
      .update(patients)
      .set(updateData)
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

  async lookup(query: string, limit = 20, clinicId?: number): Promise<PatientSummary[]> {
    const s = `%${query}%`;
    const conditions = [
      sql`(${patients.deletedAt} IS NULL OR ${patients.deletedAt}::text = '')`,
      or(
        like(patients.firstName, s),
        like(patients.surname, s),
        like(patients.phone, s),
        like(patients.mobile1, s),
        sql`CAST(${patients.regid} AS TEXT) LIKE ${s}`,
      )
    ];

    if (clinicId) {
      conditions.push(eq(patients.clinicId, clinicId));
    }

    const rows = await this.db
      .select()
      .from(patients)
      .where(and(...conditions))
      .limit(limit);
    return rows.map(row => this.toSummary(row));
  }

  async findBirthdays(mmdd: string, clinicId?: number): Promise<PatientSummary[]> {
    const conditions = [
      sql`(deleted_at IS NULL OR deleted_at::text = '')`,
      sql`to_char(${patients.dob}::date, 'MM-DD') = ${mmdd}`
    ];

    if (clinicId) {
      conditions.push(eq(patients.clinicId, clinicId));
    }

    const rows = await this.db
      .select()
      .from(patients)
      .where(and(...conditions));
    return rows.map(row => this.toSummary(row));
  }

  async getFormMeta(clinicId?: number): Promise<PatientFormMeta> {
    try {
      // 1. Fetch Doctors — Primary source is doctorsLegacy (tenant's doctors table)
      // but we join with users to get the most up-to-date name/status if available.
      const doctorConditions = [
        isNull(doctorsLegacy.deletedAt),
      ];

      if (clinicId) {
        doctorConditions.push(eq(doctorsLegacy.clinicId, clinicId));
      }

      const [doctors, religions, occupations, references, referralSrcs] = await Promise.all([
        this.db
          .select({
            id: doctorsLegacy.id,
            name: doctorsLegacy.name,
            userName: users.name,
            legacyFee: doctorsLegacy.consultationFee,
            userFee: users.consultationFee,
            isActive: users.isActive
          })
          .from(doctorsLegacy)
          .leftJoin(users, eq(doctorsLegacy.id, users.id))
          .where(and(...doctorConditions))
          .catch((err) => {
            console.error('[PatientRepo] Failed to fetch doctors:', err.message);
            return [];
          }),
        this.db.select().from(religionLegacy).catch((err) => {
          console.error('[PatientRepo] Failed to fetch religions:', err.message);
          return [];
        }),
        this.db.select().from(occupationLegacy).catch((err) => {
          console.error('[PatientRepo] Failed to fetch occupations:', err.message);
          return [];
        }),
        this.db.select().from(refrencetypeLegacy).catch((err) => {
          console.error('[PatientRepo] Failed to fetch references:', err.message);
          return [];
        }),
        this.db.select().from(referralSources).where(eq(referralSources.isActive, true)).catch((err) => {
          console.error('[PatientRepo] Failed to fetch referral sources:', err.message);
          return [];
        }),
      ]);

      // Deduplicate doctors by ID (caused by left join if multiple legacy records match)
      const uniqueDoctorsMap = new Map<number, any>();
      doctors.forEach(d => {
        if (!uniqueDoctorsMap.has(d.id)) {
          uniqueDoctorsMap.set(d.id, d);
        }
      });
      const uniqueDoctors = Array.from(uniqueDoctorsMap.values());

      return {
        doctors: uniqueDoctors.map(d => {
          // If userFee is 0 or null, try legacyFee
          let fee = (d.userFee && Number(d.userFee) > 0) ? d.userFee : d.legacyFee;
          let numFee: number | null = null;

          if (fee !== null && fee !== undefined) {
            // Remove any non-numeric characters except decimal point
            const cleaned = String(fee).replace(/[^0-9.]/g, '');
            numFee = cleaned ? Number(cleaned) : 0;
          }

          return {
            id: d.id,
            name: d.name,
            consultationFee: numFee
          };
        }),
        religions: Array.from(new Set(religions.map((r: any) => r.religion).filter(Boolean))),
        occupations: Array.from(new Set(occupations.map((o: any) => o.occupation).filter(Boolean))),
        references: Array.from(new Set(references.map((r: any) => r.referencetype).filter(Boolean))),
        statuses: ['Single', 'Married', 'Divorced', 'Widowed'],
        titles: ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Master', 'Baby'],
      };
    } catch (err: any) {
      console.error('[PatientRepo] CRITICAL error in getFormMeta:', err);
      // Return a minimal valid object instead of throwing
      return {
        doctors: [],
        religions: [],
        occupations: [],
        references: [],
        statuses: ['Single', 'Married', 'Divorced', 'Widowed'],
        titles: ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Master', 'Baby'],
      };
    }
  }

  // ─── Family Group ───

  async getFamilyGroups(params: {
    page: number;
    limit: number;
    search?: string;
    clinicId?: number;
  }): Promise<{ data: FamilyGroupSummary[]; total: number }> {
    const { page, limit, search, clinicId } = params;
    const offset = (page - 1) * limit;

    const whereConditions = [sql`(fg.deleted_at IS NULL OR fg.deleted_at::text = '')` as any];
    if (clinicId) {
      whereConditions.push(sql`(p.clinic_id = ${clinicId} OR p.clinic_id IS NULL)`);
    }
    if (search) {
      const s = `%${search}%`;
      whereConditions.push(sql`(p.first_name ILIKE ${s} OR p.surname ILIKE ${s} OR CAST(fg.regid AS TEXT) LIKE ${s})`);
    }

    const whereClause = sql.join(whereConditions, sql` AND `);

    const [data, countRes] = await Promise.all([
      this.db.execute(sql`
        SELECT 
          fg.regid,
          p.first_name as name,
          p.surname,
          count(*)::int as total_members
        FROM familygroups fg
        JOIN case_datas p ON p.regid = fg.regid
        WHERE ${whereClause}
        GROUP BY fg.regid, p.first_name, p.surname
        ORDER BY fg.regid DESC
        LIMIT ${limit} OFFSET ${offset}
      `),
      this.db.execute(sql`
        SELECT count(DISTINCT fg.regid)::int as total
        FROM familygroups fg
        JOIN case_datas p ON p.regid = fg.regid
        WHERE ${whereClause}
      `)
    ]);

    return {
      data: (data as any[]).map(r => ({
        id: r.regid,
        regid: r.regid,
        familyRegid: r.regid,
        name: r.name || '',
        surname: r.surname || '',
        totalMembers: r.total_members,
      })),
      total: (countRes as any[])[0]?.total || 0,
    };
  }
  async getFamilyMembers(regid: number): Promise<FamilyMember[]> {
    const rows = await this.db.execute(sql`
      SELECT 
        fg.id,
        fg.regid,
        fg.member_regid,
        fg.relation,
        p.first_name || ' ' || COALESCE(p.surname, '') as member_name,
        COALESCE(p.mobile1, p.phone) as member_mobile
      FROM familygroups fg
      JOIN case_datas p ON p.regid = fg.member_regid
      WHERE fg.regid = ${regid} AND (fg.deleted_at IS NULL OR fg.deleted_at::text = '')
      ORDER BY p.first_name ASC
    `);

    return (rows as any[]).map(r => ({
      id: r.id,
      regid: r.regid,
      memberRegid: r.member_regid,
      relation: r.relation || 'Member',
      memberName: r.member_name ? r.member_name.trim() : '',
      memberMobile: r.member_mobile || '',
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
      .select({ firstName: patients.firstName, surname: patients.surname, phone: patients.phone, mobile1: patients.mobile1 })
      .from(patients)
      .where(eq(patients.regid, data.memberRegid))
      .limit(1);

    return {
      id: row!.id,
      regid: row!.regid!,
      memberRegid: row!.memberRegid!,
      relation: row!.relation || '',
      memberName: p ? `${p.firstName} ${p.surname}`.trim() : null,
      memberMobile: (p?.mobile1 || p?.phone) || null,
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
      clinicId: row.clinicId || null,
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
      id: row.id || 0,
      regid: row.regid || 0,
      fullName: `${row.firstName || ''} ${row.surname || ''}`.trim(),
      gender: row.gender || '',
      age: row.age || null,
      phone: row.mobile1 || row.phone || null,
      mobile1: row.mobile1 || null,
      dob: row.dob || row.dateOfBirth || null,
      city: row.city || null,
      lastVisit: row.lastVisit || row.updatedAt || null,
      totalVisits: 0,
      doctorName: row.assitantDoctor || row.assistantDoctor || null,
      createdAt: row.createdAt || new Date(),
    };
  }
}
