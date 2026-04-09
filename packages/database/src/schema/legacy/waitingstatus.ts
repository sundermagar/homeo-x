import { pgTable, integer, date, text, timestamp } from "drizzle-orm/pg-core";

export const waitingstatusLegacy = pgTable("waitingstatus", {
  id: integer("id").notNull(),
  regid: integer("regid"),
  appointmentId: integer("appointment_id"),
  waitingNumber: integer("waiting_number"),
  date: date("date"),
  time: text("time"),
  doctorId: integer("doctor_id"),
  consultationFees: integer("consultation_fees"),
  status: integer("status"),
  checkedInAt: timestamp("checked_in_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
