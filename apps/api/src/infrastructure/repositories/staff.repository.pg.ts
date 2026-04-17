import { eq, like, or, sql, isNull, and, desc } from 'drizzle-orm';
import {
  doctorsLegacy,
  employeesLegacy,
  receptionistsLegacy,
  clinicadminsLegacy,
  accountsLegacy,
} from '@mmc/database/schema';
import type { DbClient } from '@mmc/database';
import type { StaffMember, StaffSummary, StaffCategory } from '@mmc/types';
import type { StaffRepository } from '../../domains/staff/ports/staff.repository';
import type { CreateStaffInput, UpdateStaffInput } from '@mmc/validation';

/**
 * Returns the correct Drizzle table reference for a given staff category.
 */
function getTable(category: StaffCategory) {
  switch (category) {
    case 'doctor': return doctorsLegacy;
    case 'employee': return employeesLegacy;
    case 'receptionist': return receptionistsLegacy;
    case 'clinicadmin': return clinicadminsLegacy;
    case 'account': return accountsLegacy;
  }
}

/**
 * PostgreSQL adapter for StaffRepository port.
 * Queries the correct legacy table based on the staff category.
 */
export class StaffRepositoryPg implements StaffRepository {
  constructor(private readonly db: DbClient) {}

  async findAll(params: {
    category: StaffCategory;
    page: number;
    limit: number;
    search?: string;
  }): Promise<{ data: StaffSummary[]; total: number }> {
    const { category, page, limit, search } = params;
    const offset = (page - 1) * limit;
    const table = getTable(category);

    const conditions = [isNull(table.deletedAt)];

    if (search) {
      conditions.push(
        or(
          like(table.name, `%${search}%`),
          like(table.email, `%${search}%`),
          like(table.mobile, `%${search}%`),
        )!,
      );
    }

    const whereClause = and(...conditions);

    const [rows, countResult] = await Promise.all([
      this.db
        .select()
        .from(table)
        .where(whereClause)
        .orderBy(table.name)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(table)
        .where(whereClause),
    ]);

    return {
      data: rows.map((r: any) => this.toSummary(r, category)),
      total: countResult[0]?.count ?? 0,
    };
  }

  async findById(category: StaffCategory, id: number): Promise<StaffMember | null> {
    const table = getTable(category);
    const [row] = await this.db.select().from(table).where(eq(table.id, id)).limit(1);
    return row ? this.toDomain(row as any, category) : null;
  }

  async create(data: CreateStaffInput): Promise<StaffMember> {
    const { category } = data;
    const table = getTable(category);

    // Manual ID generation for legacy tables
    const maxIdResult = await this.db.select({ maxId: sql<number>`MAX(id)` }).from(table);
    const nextId = (maxIdResult[0]?.maxId ?? 0) + 1;

    // Build the insert payload based on category
    const payload: Record<string, any> = {
      id: nextId,
      name: category === 'doctor'
        ? (data.firstname ? `${data.title || 'Dr'} ${data.firstname} ${data.surname || ''}`.trim() : data.name)
        : data.name,
      email: data.email || '',
      mobile: data.mobile,
      mobile2: data.mobile2 || '',
      gender: data.gender || 'Male',
      designation: data.designation || '',
      dept: data.dept || 4,
      city: data.city || '',
      address: data.address || '',
      about: data.about || '',
      dateBirth: data.dateBirth || '1990-01-01',
      dateLeft: data.dateLeft || '1990-01-01',
      salaryCur: data.salaryCur || 0,
    };

    if (data.password) {
      payload.password = data.password;
    }

    // Table-specific mandatory missing fields
    if (category === 'employee') {
      payload.packages = ''; // Required column in legacy employees table
    }

    // Doctor-specific fields
    if (category === 'doctor') {
      Object.assign(payload, {
        title: data.title || 'Dr',
        firstname: data.firstname || '',
        middlename: data.middlename || '',
        surname: data.surname || '',
        qualification: data.qualification || '',
        instutitue: data.institute || '',
        passedout: data.passedOut || '',
        registrationId: data.registrationId || '',
        consultationFee: data.consultationFee || '',
        permanentaddress: data.permanentAddress || '',
        clinicId: data.clinicId || null,
        aadharnumber: data.aadharnumber || '',
        pannumber: data.pannumber || '',
        aadhar_card: data.aadharCard || '',
        pan_card: data.panCard || '',
        appointment_letter: data.appointmentLetter || '',
        registration_certificate: data.registrationCertificate || '',
        joiningdate: data.joiningdate || null,
        profilepic: data.profilepic || '',
        col10Document: data.col10Document || '',
        col12Document: data.col12Document || '',
        bhmsDocument: data.bhmsDocument || '',
        mdDocument: data.mdDocument || '',
      });
    }

    console.log(`[StaffRepo] Inserting into ${category}:`, JSON.stringify(payload, null, 2));
    const [row] = await this.db.insert(table).values(payload as any).returning();
    return this.toDomain(row as any, category);
  }

  async update(category: StaffCategory, id: number, data: UpdateStaffInput): Promise<StaffMember | null> {
    const table = getTable(category);

    // Check existence
    const [existing] = await this.db.select().from(table).where(eq(table.id, id)).limit(1);
    if (!existing) return null;

    const payload: Record<string, any> = {};

    // Map shared fields
    if (data.name !== undefined) payload.name = data.name;
    if (data.email !== undefined) payload.email = data.email;
    if (data.mobile !== undefined) payload.mobile = data.mobile;
    if (data.mobile2 !== undefined) payload.mobile2 = data.mobile2;
    if (data.gender !== undefined) payload.gender = data.gender;
    if (data.designation !== undefined) payload.designation = data.designation;
    if (data.dept !== undefined) payload.dept = data.dept;
    if (data.city !== undefined) payload.city = data.city;
    if (data.address !== undefined) payload.address = data.address;
    if (data.about !== undefined) payload.about = data.about;
    if (data.dateBirth !== undefined) payload.dateBirth = data.dateBirth;
    if (data.dateLeft !== undefined) payload.dateLeft = data.dateLeft;
    if (data.salaryCur !== undefined) payload.salaryCur = data.salaryCur;
    if (data.password) payload.password = data.password;

    // Doctor-specific
    if (category === 'doctor') {
      if (data.title !== undefined) payload.title = data.title;
      if (data.firstname !== undefined) payload.firstname = data.firstname;
      if (data.middlename !== undefined) payload.middlename = data.middlename;
      if (data.surname !== undefined) payload.surname = data.surname;
      if (data.qualification !== undefined) payload.qualification = data.qualification;
      if (data.institute !== undefined) payload.instutitue = data.institute;
      if (data.passedOut !== undefined) payload.passedout = data.passedOut;
      if (data.registrationId !== undefined) payload.registrationId = data.registrationId;
      if (data.consultationFee !== undefined) payload.consultationFee = data.consultationFee;
      if (data.permanentAddress !== undefined) payload.permanentaddress = data.permanentAddress;
      if (data.aadharnumber !== undefined) payload.aadharnumber = data.aadharnumber;
      if (data.pannumber !== undefined) payload.pannumber = data.pannumber;
      if (data.aadharCard !== undefined) payload.aadhar_card = data.aadharCard;
      if (data.panCard !== undefined) payload.pan_card = data.panCard;
      if (data.appointmentLetter !== undefined) payload.appointment_letter = data.appointmentLetter;
      if (data.registrationCertificate !== undefined) payload.registration_certificate = data.registrationCertificate;
      if (data.joiningdate !== undefined) payload.joiningdate = data.joiningdate;
      if (data.profilepic !== undefined) payload.profilepic = data.profilepic;
      if (data.col10Document !== undefined) payload.col10Document = data.col10Document;
      if (data.col12Document !== undefined) payload.col12Document = data.col12Document;
      if (data.bhmsDocument !== undefined) payload.bhmsDocument = data.bhmsDocument;
      if (data.mdDocument !== undefined) payload.mdDocument = data.mdDocument;

      // Auto-build name from parts
      if (data.firstname !== undefined || data.surname !== undefined) {
        const fn = data.firstname ?? (existing as any).firstname ?? '';
        const sn = data.surname ?? (existing as any).surname ?? '';
        const t = data.title ?? (existing as any).title ?? 'Dr';
        payload.name = `${t} ${fn} ${sn}`.trim();
      }
    }

    payload.updatedAt = new Date();

    console.log(`[StaffRepo] Updating ${category} ID ${id}:`, JSON.stringify(payload, null, 2));
    const [updated] = await this.db.update(table).set(payload as any).where(eq(table.id, id)).returning();
    return this.toDomain(updated as any, category);
  }

  async delete(category: StaffCategory, id: number): Promise<boolean> {
    const table = getTable(category);
    const [row] = await this.db.select().from(table).where(eq(table.id, id)).limit(1);
    if (!row) return false;

    await this.db
      .update(table)
      .set({ deletedAt: new Date() } as any)
      .where(eq(table.id, id));
    return true;
  }

  // ─── Mappers ───

  private toSummary(row: any, category: StaffCategory): StaffSummary {
    return {
      id: row.id,
      category,
      name: row.name || '',
      email: row.email || '',
      mobile: row.mobile || '',
      gender: row.gender || '',
      designation: row.designation || '',
      isActive: !row.deletedAt,
      createdAt: row.createdAt?.toISOString?.() ?? null,
      city: row.city || '',
      title: row.title ?? null,
      qualification: row.qualification ?? null,
      consultationFee: row.consultationFee ?? null,
    };
  }

  private toDomain(row: any, category: StaffCategory): StaffMember {
    return {
      id: row.id,
      category,
      name: row.name || '',
      email: row.email || '',
      mobile: row.mobile || '',
      mobile2: row.mobile2 || '',
      gender: row.gender || '',
      designation: row.designation || '',
      department: row.dept ?? 0,
      city: row.city || '',
      address: row.address || '',
      about: row.about || '',
      dateBirth: row.dateBirth ?? null,
      dateLeft: row.dateLeft ?? null,
      salary: row.salaryCur ?? 0,
      isActive: !row.deletedAt,
      createdAt: row.createdAt?.toISOString?.() ?? null,
      updatedAt: row.updatedAt?.toISOString?.() ?? null,
      // Doctor-specific
      title: row.title ?? null,
      firstname: row.firstname ?? null,
      middlename: row.middlename ?? null,
      surname: row.surname ?? null,
      qualification: row.qualification ?? null,
      institute: row.instutitue ?? null,
      passedOut: row.passedout ?? null,
      registrationId: row.registrationId ?? null,
      consultationFee: row.consultationFee ?? null,
      permanentAddress: row.permanentaddress ?? null,
      clinicId: row.clinicId ?? null,
      aadharnumber: row.aadharnumber ?? null,
      pannumber: row.pannumber ?? null,
      aadharCard: row.aadharCard ?? null,
      panCard: row.panCard ?? null,
      appointmentLetter: row.appointmentLetter ?? null,
      registrationCertificate: row.registrationCertificate ?? null,
      joiningdate: row.joiningdate ?? null,
      profilepic: row.profilepic ?? null,
      col10Document: row.col10Document ?? null,
      col12Document: row.col12Document ?? null,
      bhmsDocument: row.bhmsDocument ?? null,
      mdDocument: row.mdDocument ?? null,
    };
  }
}
