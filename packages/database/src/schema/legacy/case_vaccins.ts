import { pgTable, integer, timestamp } from "drizzle-orm/pg-core";

export const caseVaccinsLegacy = pgTable("case_vaccins", {
  id: integer("id").notNull(),
  regId: integer("regid"),
  vaccineeId: integer("vaccinee_id"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
