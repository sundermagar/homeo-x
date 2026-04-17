import { pgTable, serial, text, integer, boolean, timestamp, date, real } from 'drizzle-orm/pg-core';
import type { Role } from '@mmc/types';

/**
 * Users table — shared across all tenant schemas.
 * Merged: legacy extended fields (gender, mobile, city, address, about)
 * + our fields (isActive, roleId, roleName, type with Role enum)
 */
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  type: text('type').$type<Role>(),              // 'Doctor', 'Receptionist', 'Admin', 'Account', etc.
  contextId: integer('context_id'),
  roleId: integer('role_id'),
  roleName: text('role_name'),
  phone: text('phone'),
  // clinicId: integer('clinic_id'),
  
  // Professional & Personal Details (Parity with Legacy doctors/employees/receptionists)
  title: text('title'),
  firstname: text('firstname'),
  middlename: text('middlename'),
  surname: text('surname'),
  gender: text('gender').default('Male'),
  mobile: text('mobile'),
  mobile2: text('mobile2'),
  city: text('city'),
  address: text('address'),
  permanentAddress: text('permanent_address'),
  about: text('about'),
  dateBirth: date('date_birth'),
  dateLeft: date('date_left'),
  joiningdate: date('joiningdate'),
  
  // Credentials & Finance
  designation: text('designation'),
  dept: integer('dept'),
  qualification: text('qualification'),
  institute: text('institute'),
  passedOut: text('passed_out'),
  registrationId: text('registration_id'),
  consultationFee: real('consultation_fee').default(0),
  salaryCur: real('salary_cur').default(0),
  aadharnumber: text('aadharnumber'),
  pannumber: text('pannumber'),

  // Documents/File Paths
  profilepic: text('profilepic'),
  registrationCertificate: text('registration_certificate'),
  aadharCard: text('aadhar_card'),
  panCard: text('pan_card'),
  appointmentLetter: text('appointment_letter'),
  col10Document: text('10_document'),
  col12Document: text('12_document'),
  bhmsDocument: text('bhms_document'),
  mdDocument: text('md_document'),

  isActive: boolean('is_active').default(true).notNull(),
  rememberToken: text('remember_token'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});
