import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const appointmentCaseLegacy = pgTable("appointment_case", {
  id: integer("id").notNull(),
  patientId: text("patient_id").notNull(),
  doctorId: text("doctor_id").notNull(),
  appointmentId: integer("appointment_id").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
