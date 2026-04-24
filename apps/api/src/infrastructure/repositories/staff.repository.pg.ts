import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import type { DbClient } from '@mmc/database';
import type { StaffMember, StaffSummary, StaffCategory } from '@mmc/types';
import type { StaffRepository } from '../../domains/staff/ports/staff.repository';
import type { CreateStaffInput, UpdateStaffInput } from '@mmc/validation';
import { Role } from '@mmc/types';

/**
 * PostgreSQL adapter for StaffRepository port.
 * Queries the correct legacy table based on the staff category using raw SQL
 * to avoid missing column errors in the legacy database.
 */
export class StaffRepositoryPg implements StaffRepository {
  constructor(private readonly db: DbClient) { }

  private getTableName(category: StaffCategory): string {
    switch (category) {
      case 'doctor': return 'doctors';
      case 'employee': return 'employees';
      case 'receptionist': return 'receptionists';
      case 'clinicadmin': return 'clinicadmins';
      case 'account': return 'accounts';
      default: return 'employees';
    }
  }

  // Mirrors MMC's TYPE_TO_ROLE — maps category string → Role enum
  private static readonly CATEGORY_ROLE_MAP: Record<StaffCategory, Role> = {
    doctor: Role.Doctor,
    receptionist: Role.Receptionist,
    employee: Role.Employee,
    clinicadmin: Role.Clinicadmin,
    account: Role.Account,
  };

  // Hard-coded role IDs — must match roles table seeded data
  private static readonly ROLE_ID_MAP: Partial<Record<Role, number>> = {
    [Role.Admin]: 1,
    [Role.Clinicadmin]: 2,
    [Role.Doctor]: 3,
    [Role.Receptionist]: 4,
    [Role.Employee]: 5,
    [Role.Dispensary]: 6,
    [Role.Account]: 7,
  };

  /** Look up role_id by name from the roles table (case-insensitive). */
  private async resolveRoleId(roleName: string): Promise<number | null> {
    const rows = await this.db.execute(
      sql`SELECT id FROM roles WHERE LOWER(name) = LOWER(${roleName}) AND (deleted_at IS NULL OR deleted_at::text = '') LIMIT 1`
    ) as any[];
    return rows[0]?.id ?? null;
  }

  async findAll(params: {
    category: StaffCategory;
    page: number;
    limit: number;
    search?: string;
    clinicId?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{ data: StaffSummary[]; total: number; activeCount: number }> {
    const { category, page, limit, search, clinicId, sortBy = 'id', sortOrder = 'DESC' } = params;
    const offset = (page - 1) * limit;
    const isClinicAdmin = category === 'clinicadmin';
    const tableIdentifier = isClinicAdmin ? sql`public.users` : sql.identifier(this.getTableName(category));

    const searchSafe = search ? `%${search}%` : null;

    const isDoctor = category === 'doctor';
    const selectCols = ['id', 'name', 'email', 'mobile', 'gender', 'designation', 'city', 'created_at', 'deleted_at'];
    if (isDoctor) selectCols.push('consultation_fee');

    const colFragment = sql.join(selectCols.map(c => sql.identifier(c)), sql`, `);

    // Filter by clinicId if provided. 
    // Note: clinicadmins table does not have clinic_id, so we use context_id from users table for that category.
    const supportsClinicId = ['doctor', 'receptionist', 'employee', 'account', 'clinicadmin'].includes(category);
    const clinicCol = isClinicAdmin ? 'context_id' : 'clinic_id';
    const clinicFilter = (clinicId && supportsClinicId) 
      ? sql`AND (${sql.identifier(clinicCol)} = ${clinicId} OR ${sql.identifier(clinicCol)}::text = ${String(clinicId)})` 
      : sql``;

    const typeFilter = isClinicAdmin ? sql`AND type = 'Clinicadmin'` : sql``;

    // Handle dynamic sorting safely
    const validSortCols = [...selectCols];
    const finalSortBy = validSortCols.includes(sortBy) ? sortBy : 'id';
    const finalSortOrder = sortOrder === 'ASC' ? sql`ASC` : sql`DESC`;

    console.log('[StaffRepo] findAll starting', { category, limit, offset, clinicId, sortBy: finalSortBy, sortOrder });
    const rows = await this.db.execute(sql`
      SELECT ${colFragment}
      FROM ${tableIdentifier}
      WHERE (deleted_at IS NULL OR deleted_at::text = '')
      ${typeFilter}
      ${clinicFilter}
      ${searchSafe ? sql`AND (name ILIKE ${searchSafe} OR email ILIKE ${searchSafe} OR mobile ILIKE ${searchSafe})` : sql``}
      ORDER BY ${sql.identifier(finalSortBy)} ${finalSortOrder}
      LIMIT ${limit} OFFSET ${offset}
    `);
    console.log('[StaffRepo] SELECT query completed', (rows as any[]).length);

    const countResult = await this.db.execute(sql`
      SELECT count(*)::int as count FROM ${tableIdentifier}
      WHERE (deleted_at IS NULL OR deleted_at::text = '')
      ${typeFilter}
      ${clinicFilter}
      ${searchSafe ? sql`AND (name ILIKE ${searchSafe} OR email ILIKE ${searchSafe} OR mobile ILIKE ${searchSafe})` : sql``}
    `);
    console.log('[StaffRepo] COUNT query completed', (countResult as any[])[0]?.count);

    const activeCountResult = await this.db.execute(sql`
      SELECT count(*)::int as count FROM ${tableIdentifier}
      WHERE (deleted_at IS NULL OR deleted_at::text = '')
      ${typeFilter}
      ${clinicFilter}
    `);

    return {
      data: (rows as any[]).map((r: any) => this.toSummary(r, category)),
      total: (countResult as any[])[0]?.count ?? 0,
      activeCount: (activeCountResult as any[])[0]?.count ?? 0,
    };
  }

  async findById(category: StaffCategory, id: number): Promise<StaffMember | null> {
    const table = this.getTableName(category);
    const isDoctor = category === 'doctor';

    // Base columns shared by all staff tables (employees, receptionists, accounts, doctors)
    const baseColumns = [
      'id', 'name', 'email', 'mobile', 'mobile2', 'gender', 'designation', 'dept',
      'city', 'address', 'about', 'date_birth', 'date_left', 'salary_cur',
      'created_at', 'updated_at', 'deleted_at'
    ];

    // Doctor specific columns (only in doctors table)
    const doctorColumns = [
      'title', 'firstname', 'middlename', 'surname', 'qualification',
      'instutitue', 'passedout', 'joiningdate', '"registrationId"',
      'consultation_fee', 'aadharnumber', 'pannumber', 'permanentaddress',
      'aadhar_card', 'pan_card', 'appointment_letter', 'registration_certificate',
      'profilepic', '"10_document"', '"12_document"', 'bhms_document', 'md_document'
    ];

    let selectColumns = [...baseColumns];
    if (isDoctor) selectColumns = selectColumns.concat(doctorColumns);

    const colFragment = sql.join(selectColumns.map(c => sql.raw(c)), sql`, `);

    try {
      const rows = await this.db.execute(sql`
          SELECT ${colFragment}
          FROM ${sql.identifier(table)}
          WHERE id = ${id} AND (deleted_at IS NULL OR deleted_at::text = '')
          LIMIT 1
        `);

      const row = (rows as any[])[0];
      if (!row) return null;
      return this.toDomain(row, category);
    } catch (err: any) {
      // Log to a file we can read from the toolkit
      const logMsg = `[${new Date().toISOString()}] findById FAILED for ${category}/${id}.\nError: ${err.message}\nSQL: SELECT ${selectColumns.join(', ')} FROM ${table}\n\n`;
      require('fs').appendFileSync('repo_error.log', logMsg);
      console.error(`[StaffRepo] findById FAILED for ${category}/${id}:`, err.message);
      return null;
    }
  }

  async create(data: CreateStaffInput): Promise<StaffMember> {
    const { category } = data;
    const table = this.getTableName(category);
    const isAccount = category === 'account';

    // Hash password with bcrypt (cost 10, same as MMC)
    const hashedPassword = data.password
      ? await bcrypt.hash(data.password, 10)
      : '';

    // Check email uniqueness in public.users table (same as legacy)
    if (data.email) {
      const existingUsers = await this.db.execute(
        sql`SELECT id FROM public.users WHERE LOWER(email) = LOWER(${data.email}) AND (deleted_at IS NULL OR deleted_at::text = '') LIMIT 1`
      ) as any[];
      if (existingUsers.length > 0) {
        throw new Error('Email already exists');
      }
    }

    const name = category === 'doctor'
      ? (data.firstname ? `${data.title || 'Dr'} ${data.firstname} ${data.surname || ''}`.trim() : data.name)
      : data.name;

    const roleEnum = StaffRepositoryPg.CATEGORY_ROLE_MAP[category] ?? Role.Receptionist;
    const roleId = StaffRepositoryPg.ROLE_ID_MAP[roleEnum] ?? 4;
    const roleName = roleEnum;

    let nextId: number;
    let roleAssignId: number;

    // ─── 0. Mirror to public.users FIRST ───
    // This allows us to get a unique ID that we then force into the staff table.
    // This ensures consistency across the platform.
    // context_id is set to clinicId so login can resolve the correct tenant
    const contextId = (data as any).clinicId || 1;
    const userMirrorResult = await this.db.execute(sql`
      INSERT INTO public.users (
        name, email, password, type, context_id,
        is_active, created_at, updated_at
      ) VALUES (
        ${name}, ${data.email || ''}, ${hashedPassword}, ${roleEnum},
        ${contextId}, true, NOW(), NOW()
      ) RETURNING id
    `) as any[];

    const userId = userMirrorResult[0].id;
    nextId = userId; // Force staff ID to match user ID
    roleAssignId = userId;

    // ─── 1. Insert into specific Staff table ───
    const staffCols = [
      'id', 'name', 'email', 'mobile', 'mobile2', 'gender', 'designation', 'dept', 'city', 'address', 'about',
      'date_birth', 'date_left', 'salary_cur', 'password'
    ];
    const staffVals: any[] = [
      nextId, name, data.email || '', data.mobile || '', data.mobile2 || '', data.gender || 'Male',
      data.designation || '', data.dept || 4, data.city || '', data.address || '', data.about || '',
      data.dateBirth || null, data.dateLeft || null, data.salaryCur || 0, hashedPassword
    ];

    // Add clinic_id for relevant categories — ties the staff to their organization
    // Doctors and Receptionists in legacy schema typically use clinic_id.
    // Note: clinicadmins table does NOT have a clinic_id column.
    const cid = (data as any).clinicId;
    if (cid && (category === 'doctor' || category === 'receptionist' || category === 'employee' || category === 'account')) {
      staffCols.push('clinic_id');
      staffVals.push(cid);
    }

    // Add doctor-specific columns if applicable
    if (category === 'doctor') {
      staffCols.push(
        'title', 'firstname', 'middlename', 'surname', 'qualification', 'instutitue', 'passedout',
        'joiningdate', '"registrationId"', 'consultation_fee', 'permanentaddress', 'profilepic',
        '"10_document"', '"12_document"', 'bhms_document', 'md_document', 'registration_certificate',
        'aadhar_card', 'pan_card', 'appointment_letter', 'aadharnumber', 'pannumber'
      );
      staffVals.push(
        data.title || 'Dr', data.firstname || '', data.middlename || '', data.surname || '',
        data.qualification || '', data.institute || '', data.passedOut || '',
        data.joiningdate || null, data.registrationId || '', String(data.consultationFee || 0),
        data.permanentAddress || '', data.profilepic || '', data.col10Document || '',
        data.col12Document || '', data.bhmsDocument || '', data.mdDocument || '',
        data.registrationCertificate || '', data.aadharCard || '', data.panCard || '',
        data.appointmentLetter || '', data.aadharnumber || '', data.pannumber || ''
      );
    }

    await this.db.execute(sql`
      INSERT INTO ${sql.identifier(table)} (${sql.join(staffCols.map(c => sql.raw(c)), sql`, `)}, created_at, updated_at)
      VALUES (${sql.join(staffVals.map(v => sql`${v}`), sql`, `)}, NOW(), NOW())
    `);

    // ─── 2. Assign Role ───
    await this.db.execute(sql`
      INSERT INTO role_user (id, user_id, role_id, created_at)
      VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM role_user), ${roleAssignId}, ${roleId}, NOW())
      ON CONFLICT (id) DO NOTHING
    `);

    const created = await this.findById(category, nextId);
    if (!created) throw new Error('Failed to retrieve created staff member');
    return created;
  }

  async update(category: StaffCategory, id: number, data: UpdateStaffInput): Promise<StaffMember | null> {
    const table = this.getTableName(category);
    const isAccount = category === 'account';

    // Check existence
    const existing = await this.findById(category, id);
    if (!existing) return null;

    const name = category === 'doctor' && (data.firstname || data.surname)
      ? `${data.title || existing.title || 'Dr'} ${data.firstname || existing.firstname || ''} ${data.surname || existing.surname || ''}`.trim()
      : (data.name ?? existing.name);

    const toDate = (val: string | undefined | null) => (val === '' || val === undefined) ? null : val;

    // Build update fragments dynamically
    const updates = [
      sql`name = ${name}`,
      sql`email = ${data.email ?? existing.email}`,
      sql`mobile = ${data.mobile ?? existing.mobile}`,
      sql`mobile2 = ${data.mobile2 ?? existing.mobile2}`,
      sql`gender = ${data.gender ?? existing.gender}`,
      sql`designation = ${data.designation ?? existing.designation}`,
      sql`city = ${data.city ?? existing.city}`,
      sql`address = ${data.address ?? existing.address}`,
      sql`about = ${data.about ?? existing.about}`,
      sql`date_birth = ${toDate(data.dateBirth ?? (existing.dateBirth as string))}`,
      sql`date_left = ${toDate(data.dateLeft ?? (existing.dateLeft as string))}`,
      sql`updated_at = NOW()`
    ];

    if (!isAccount) {
      updates.push(sql`dept = ${data.dept ?? existing.department}`);
      updates.push(sql`salary_cur = ${data.salaryCur ?? existing.salary}`);
    }

    if (category === 'doctor') {
      updates.push(
        sql`title = ${data.title ?? existing.title}`,
        sql`firstname = ${data.firstname ?? existing.firstname}`,
        sql`middlename = ${data.middlename ?? existing.middlename}`,
        sql`surname = ${data.surname ?? existing.surname}`,
        sql`qualification = ${data.qualification ?? existing.qualification}`,
        sql`instutitue = ${data.institute ?? existing.institute}`,
        sql`passedout = ${data.passedOut ?? existing.passedOut}`,
        sql`joiningdate = ${toDate(data.joiningdate ?? (existing.joiningdate as string))}`,
        sql`"registrationId" = ${data.registrationId ?? existing.registrationId}`,
        sql`consultation_fee = ${data.consultationFee !== undefined ? String(data.consultationFee) : (existing.consultationFee !== null ? String(existing.consultationFee) : '0')}`,
        sql`permanentaddress = ${data.permanentAddress ?? existing.permanentAddress}`,
        sql`profilepic = ${data.profilepic ?? existing.profilepic}`,
        sql`"10_document" = ${data.col10Document ?? existing.col10Document}`,
        sql`"12_document" = ${data.col12Document ?? existing.col12Document}`,
        sql`bhms_document = ${data.bhmsDocument ?? existing.bhmsDocument}`,
        sql`md_document = ${data.mdDocument ?? existing.mdDocument}`,
        sql`registration_certificate = ${data.registrationCertificate ?? existing.registrationCertificate}`,
        sql`aadhar_card = ${data.aadharCard ?? existing.aadharCard}`,
        sql`pan_card = ${data.panCard ?? existing.panCard}`,
        sql`appointment_letter = ${data.appointmentLetter ?? existing.appointmentLetter}`,
        sql`aadharnumber = ${data.aadharnumber ?? existing.aadharnumber}`,
        sql`pannumber = ${data.pannumber ?? existing.pannumber}`
      );
    }

    let hashedPassword = '';
    if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, 10);
      updates.push(sql`password = ${hashedPassword}`);
    }

    await this.db.execute(sql`
      UPDATE ${sql.identifier(table)} SET
        ${sql.join(updates, sql`, `)}
      WHERE id = ${id}
    `);

    // Sync to public.users table
    const userUpdates = [];
    if (data.name) userUpdates.push(sql`name = ${data.name}`);
    if (data.email) userUpdates.push(sql`email = ${data.email}`);
    if (hashedPassword) userUpdates.push(sql`password = ${hashedPassword}`);
    
    if (userUpdates.length > 0) {
      await this.db.execute(sql`
        UPDATE public.users SET ${sql.join(userUpdates, sql`, `)}, updated_at = NOW()
        WHERE id = ${id}
      `);
    }

    return this.findById(category, id);
  }

  async delete(category: StaffCategory, id: number): Promise<boolean> {
    const table = this.getTableName(category);
    const existing = await this.findById(category, id);
    if (!existing) return false;

    await this.db.execute(sql`
      UPDATE ${sql.identifier(table)} SET deleted_at = NOW() WHERE id = ${id}
    `);

    // Also soft-delete the mirror row in public.users table (same as account soft-delete)
    await this.db.execute(sql`
      UPDATE public.users SET deleted_at = NOW() WHERE id = ${id} AND (deleted_at IS NULL OR deleted_at::text = '')
    `);

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
      isActive: !row.deleted_at,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      city: row.city || '',
      title: row.title ?? null,
      qualification: row.qualification ?? null,
      consultationFee: row.consultation_fee ?? null,
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
      dateBirth: row.date_birth ?? null,
      dateLeft: row.date_left ?? null,
      salary: Number(row.salary_cur) || 0,
      isActive: !row.deleted_at,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,

      // Doctor-specific fields mapping (Legacy snake_case names)
      title: row.title ?? null,
      firstname: row.firstname ?? null,
      middlename: row.middlename ?? null,
      surname: row.surname ?? null,
      qualification: row.qualification ?? null,
      institute: row.instutitue ?? null,
      passedOut: row.passedout ?? null,
      registrationId: row.registrationId ?? row.registrationid ?? null,
      consultationFee: row.consultation_fee ?? null,
      permanentAddress: row.permanentaddress ?? null,
      clinicId: row.clinic_id ?? null,
      aadharnumber: row.aadharnumber ?? null,
      pannumber: row.pannumber ?? null,
      aadharCard: row.aadhar_card ?? null,
      panCard: row.pan_card ?? null,
      appointmentLetter: row.appointment_letter ?? null,
      registrationCertificate: row.registration_certificate ?? null,
      joiningdate: row.joiningdate ?? null,
      profilepic: row.profilepic ?? null,
      col10Document: row['10_document'] ?? null,
      col12Document: row['12_document'] ?? null,
      bhmsDocument: row.bhms_document ?? null,
      mdDocument: row.md_document ?? null,
    };
  }
}
