import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const pendingAppointmentsLegacy = pgTable("pending_appointments", {
  id: integer("id").notNull(),
  regid: integer("regid"),
  randId: integer("rand_id"),
  lastDate: text("last_date"),
  nextDate: text("next_date"),
  billid: integer("billid"),
  callStatus: text("call_status"),
  callDate: text("call_date"),
  days: text("days"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
