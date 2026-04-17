import { eq, and, isNull, like, or, desc, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { users, roles } from '@mmc/database';
import type { DbClient } from '@mmc/database';
import { Role } from '@mmc/types';
import type { StaffCategory } from '@mmc/types';
import type { CreateStaffInput, UpdateStaffInput } from '@mmc/validation';

export class StaffRepositoryPg {
  constructor(private readonly db: DbClient, private readonly clinicId?: number) {}

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

    if (this.clinicId) {
      whereClause.push(eq(users.clinicId, this.clinicId));
    }

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
        mobile: r.mobile || '',
        type: r.type,
        isActive: r.isActive,
        clinicId: r.clinicId,
        city: r.city || '',
        qualification: r.qualification || '',
        designation: r.designation || '',
        createdAt: r.createdAt.toISOString()
      })),
      total,
    };
  }

  async findById(category: StaffCategory, id: number) {
    const role = this.mapCategoryToRole(category);
    
    const conditions = [eq(users.id, id), eq(users.type, role), isNull(users.deletedAt)];
    if (this.clinicId) {
      conditions.push(eq(users.clinicId, this.clinicId));
    }

    const [row] = await this.db
      .select()
      .from(users)
      .where(and(...conditions))
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

    const password = data.password || 'temporary-password';
    const hashedPassword = await bcrypt.hash(password, 10);

    const [row] = await this.db
      .insert(users)
      .values({
        name: data.name,
        email: data.email || `${Date.now()}@placeholder.com`,
        password: hashedPassword,
        type: roleType,
        roleId: roleObj?.id,
        roleName: roleObj?.displayName || roleObj?.name || roleType,
        phone: data.mobile, // Sync for legacy
        mobile: data.mobile, // Sync for modern
        mobile2: data.mobile2,
        clinicId: this.clinicId,
        isActive: true,

        // Personal & Demographic
        title: data.title,
        firstname: data.firstname,
        middlename: data.middlename,
        surname: data.surname,
        gender: data.gender,
        city: data.city,
        address: data.address,
        permanentAddress: data.permanentAddress,
        about: data.about,
        dateBirth: data.dateBirth,
        dateLeft: data.dateLeft,
        joiningdate: data.joiningdate,

        // Professional & Credentials
        designation: data.designation,
        dept: data.dept,
        qualification: data.qualification,
        institute: data.institute,
        passedOut: data.passedOut,
        registrationId: data.registrationId,
        consultationFee: data.consultationFee || 0, 
        salaryCur: data.salaryCur || 0,
        aadharnumber: data.aadharnumber,
        pannumber: data.pannumber,

        // Documents
        profilepic: data.profilepic,
        registrationCertificate: data.registrationCertificate,
        aadharCard: data.aadharCard,
        panCard: data.panCard,
        appointmentLetter: data.appointmentLetter,
        col10Document: data.col10Document,
        col12Document: data.col12Document,
        bhmsDocument: data.bhmsDocument,
        mdDocument: data.mdDocument,
      })
      .returning();
    return row;
  }

  async update(category: StaffCategory, id: number, data: UpdateStaffInput) {
    const roleType = this.mapCategoryToRole(category);
    
    const [roleObj] = await this.db
      .select()
      .from(roles)
      .where(eq(roles.name, roleType))
      .limit(1);

    const updateData: any = { 
      updatedAt: new Date(),
    };

    // Explicitly set fields if they exist in partial data to ensure DB fidelity
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.mobile !== undefined) {
      updateData.mobile = data.mobile;
      updateData.phone = data.mobile; // Sync legacy
    }
    if (data.mobile2 !== undefined) updateData.mobile2 = data.mobile2;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.permanentAddress !== undefined) updateData.permanentAddress = data.permanentAddress;
    if (data.about !== undefined) updateData.about = data.about;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.firstname !== undefined) updateData.firstname = data.firstname;
    if (data.middlename !== undefined) updateData.middlename = data.middlename;
    if (data.surname !== undefined) updateData.surname = data.surname;
    
    if (data.dateBirth !== undefined) updateData.dateBirth = data.dateBirth;
    if (data.dateLeft !== undefined) updateData.dateLeft = data.dateLeft;
    if (data.joiningdate !== undefined) updateData.joiningdate = data.joiningdate;

    if (data.designation !== undefined) updateData.designation = data.designation;
    if (data.dept !== undefined) updateData.dept = data.dept;
    if (data.qualification !== undefined) updateData.qualification = data.qualification;
    if (data.institute !== undefined) updateData.institute = data.institute;
    if (data.passedOut !== undefined) updateData.passedOut = data.passedOut;
    if (data.registrationId !== undefined) updateData.registrationId = data.registrationId;

    if (data.consultationFee !== undefined) updateData.consultationFee = data.consultationFee || 0;
    if (data.salaryCur !== undefined) updateData.salaryCur = data.salaryCur || 0;
    
    if (data.aadharnumber !== undefined) updateData.aadharnumber = data.aadharnumber;
    if (data.pannumber !== undefined) updateData.pannumber = data.pannumber;

    // Documents
    if (data.profilepic !== undefined) updateData.profilepic = data.profilepic;
    if (data.registrationCertificate !== undefined) updateData.registrationCertificate = data.registrationCertificate;
    if (data.aadharCard !== undefined) updateData.aadharCard = data.aadharCard;
    if (data.panCard !== undefined) updateData.panCard = data.panCard;
    if (data.appointmentLetter !== undefined) updateData.appointmentLetter = data.appointmentLetter;
    if (data.col10Document !== undefined) updateData.col10Document = data.col10Document;
    if (data.col12Document !== undefined) updateData.col12Document = data.col12Document;
    if (data.bhmsDocument !== undefined) updateData.bhmsDocument = data.bhmsDocument;
    if (data.mdDocument !== undefined) updateData.mdDocument = data.mdDocument;

    // Role mapping
    updateData.roleId = roleObj?.id;
    updateData.roleName = roleObj?.displayName || roleObj?.name || roleType;

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const conditions = [eq(users.id, id), eq(users.type, roleType)];
    if (this.clinicId) {
      conditions.push(eq(users.clinicId, this.clinicId));
    }

    const [row] = await this.db
      .update(users)
      .set(updateData)
      .where(and(...conditions))
      .returning();
    return row;
  }

  async delete(category: StaffCategory, id: number) {
    const role = this.mapCategoryToRole(category);
    
    const conditions = [eq(users.id, id), eq(users.type, role)];
    if (this.clinicId) {
      conditions.push(eq(users.clinicId, this.clinicId));
    }

    await this.db
      .update(users)
      .set({ deletedAt: new Date() })
      .where(and(...conditions));
  }
}
