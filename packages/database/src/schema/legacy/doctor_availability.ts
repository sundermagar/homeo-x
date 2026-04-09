import { pgTable, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const doctorAvailabilityLegacy = pgTable("doctor_availability", {
  id: integer("id").notNull(),
  doctorId: integer("doctor_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  isAvailable: boolean("is_available"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
