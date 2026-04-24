import { pgTable, serial, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const patientPreferences = pgTable('patient_preferences', {
  id: serial('id').primaryKey(),
  phone: varchar('phone', { length: 20 }).notNull().unique(),
  preferences: jsonb('preferences').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
