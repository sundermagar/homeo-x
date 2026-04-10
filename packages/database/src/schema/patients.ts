import { pgTable, serial, integer, text, varchar, date, timestamp } from 'drizzle-orm/pg-core';

/**
 * Modern Patient schema mapping to legacy 'case_datas' table.
 * Merged: friend's extended fields (patientid, title, middleName, mobile1/mobile2, pin, abhaId)
 * + our standard fields (phone, bloodGroup, referenceType, age)
 */
export const patients = pgTable('case_datas', {
  id: serial('id').primaryKey(),
  regid: integer('regid').notNull().unique(),
  patientid: integer('patientid'),
  title: text('title'),
  firstName: text('first_name').notNull(),
  middleName: text('middle_name'),
  surname: text('surname').notNull(),
  gender: text('gender'),
  dob: date('dob'),
  dateOfBirth: text('date_of_birth'),
  age: integer('age'),
  phone: varchar('phone', { length: 20 }),
  mobile1: text('mobile1'),
  mobile2: text('mobile2'),
  email: varchar('email', { length: 150 }),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  pin: text('pin'),
  bloodGroup: text('blood_group'),
  referenceType: text('reference_type'),
  abhaId: text('abha_id'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});
