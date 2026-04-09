import { pgTable, integer, real, text, date, timestamp } from "drizzle-orm/pg-core";

export const settargetsLegacy = pgTable("settargets", {
  id: integer("id").notNull(),
  doctorId: integer("doctor_id"),
  targetAmount: real("target_amount"),
  targetMonth: integer("target_month"),
  targetYear: integer("target_year"),
  targetType: text("target_type"),
  amount: integer("amount"),
  monthTarget: date("month_target"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
