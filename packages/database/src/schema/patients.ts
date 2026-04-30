import { pgTable, serial, integer, text, varchar, date, timestamp } from 'drizzle-orm/pg-core';

export const patients = pgTable('case_datas', {
  id: serial('id').primaryKey(),
  regid: integer('regid').notNull().unique(),
  patientid: integer('patientid'),
  clinicId: integer('clinic_id'),
  
  // Name
  title: text('title'),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  middleName: varchar('middle_name', { length: 255 }),
  surname: varchar('surname', { length: 255 }),
  
  // Basic Info
  gender: varchar('gender', { length: 20 }),
  dob: date('dob'),
  dateOfBirth: text('date_of_birth'),
  status: text('status'),
  
  // Contact
  phone: varchar('phone', { length: 50 }),
  mobile1: varchar('mobile1', { length: 50 }),
  mobile2: varchar('mobile2', { length: 50 }),
  email: varchar('email', { length: 255 }),
  
  // Location
  address: text('address'),
  road: text('road'),
  area: text('area'),
  city: text('city'),
  state: text('state'),
  pin: text('pin'),
  altAddress: text('alt_address'),

  // Medical / Social
  religion: text('religion'),
  occupation: text('occupation'),
  bloodGroup: text('blood_group'),

  // Reference & Referral
  reference: text('reference'),
  referedBy: text('refered_by'),
  referedName: text('refered_name'),

  // Doctor & Fees
  assitantDoctor: text('assitant_doctor'),
  consultationFee: integer('consultation_fee'),
  courierOutstation: text('courier_outstation'),

  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});
