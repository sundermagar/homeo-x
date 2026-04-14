import { pgTable, serial, integer, text, varchar, date, timestamp } from 'drizzle-orm/pg-core';

/**
 * Patient schema — maps to legacy 'case_datas' table.
 * All columns are aligned with the actual DB table to prevent query errors.
 *
 * Key notes:
 *  - `status`       = marital status (not patient status)
 *  - `reference`    = reference source text (NOT reference_type — that column doesn't exist in DB)
 *  - `referedBy`    = who referred the patient (legacy typo preserved)
 *  - `assitantDoctor` = assistant doctor name (legacy typo preserved)
 */
export const patients = pgTable('case_datas', {
  id: serial('id').primaryKey(),
  regid: integer('regid').notNull().unique(),
  patientid: integer('patientid'),
  // clinicId: integer('clinic_id'),

  // Name & Demographics
  title: text('title'),
  firstName: text('first_name').notNull(),
  middleName: text('middle_name'),
  surname: text('surname').notNull(),
  gender: text('gender'),
  dob: date('dob'),
  dateOfBirth: text('date_of_birth'),
  // age: integer('age'),

  // Status (marital status in legacy schema)
  // status: text('status'),

  // Contact
  phone: varchar('phone', { length: 20 }),
  mobile1: text('mobile1'),
  mobile2: text('mobile2'),
  email: varchar('email', { length: 150 }),

  // Address
  address: text('address'),
  // road: text('road'),
  // area: text('area'),
  city: text('city'),
  state: text('state'),
  pin: text('pin'),
  // altAddress: text('alt_address'),

  // Medical / Social
  // religion: text('religion'),
  // occupation: text('occupation'),
  // bloodGroup: text('blood_group'),

  // Reference & Referral — IMPORTANT: actual DB column is 'reference', NOT 'reference_type'
  // reference: text('reference'),
  // referedBy: text('refered_by'),
  // referedName: text('refered_name'),

  // Doctor & Fees
  // assitantDoctor: text('assitant_doctor'),
  // consultationFee: integer('consultation_fee'),
  // courierOutstation: text('courier_outstation'),

  // Identifiers
  // abhaId: text('abha_id'),
  // coupon: text('coupon').notNull().default(''),
  // scheme: text('scheme'),
  // image: text('image'),
  // sendSms: text('send_sms'),
  // referedSms: text('refered_sms'),
  // sdate: date('sdate'),

  // Notes
  notes: text('notes'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});
