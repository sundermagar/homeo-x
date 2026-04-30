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
  dateOfBirth: varchar('date_of_birth', { length: 50 }),
  
  // Contact
  phone: varchar('phone', { length: 50 }),
  mobile1: varchar('mobile1', { length: 50 }),
  mobile2: varchar('mobile2', { length: 50 }),
  email: varchar('email', { length: 255 }),
  
  // Location
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  pin: varchar('pin', { length: 20 }),
  
  // Metadata
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});
