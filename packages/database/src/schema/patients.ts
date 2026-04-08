import { pgTable, serial, varchar, integer, date, timestamp, text } from 'drizzle-orm/pg-core';

export const patients = pgTable('case_datas', {
  id: serial('id').primaryKey(),
  regid: integer('regid').notNull().unique(),
  firstName: varchar('first_name', { length: 100 }),
  surname: varchar('surname', { length: 100 }),
  gender: varchar('gender', { length: 10 }),
  dateOfBirth: date('dob'),
  age: integer('age'),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 150 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  bloodGroup: varchar('blood_group', { length: 10 }),
  referenceType: varchar('reference', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});
