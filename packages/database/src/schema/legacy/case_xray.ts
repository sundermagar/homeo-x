import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const caseXrayLegacy = pgTable("case_xray", {
  id: integer("id").notNull(),
  randId: integer("rand_id"),
  regid: integer("regid"),
  dateval: text("dateval"),
  radiologicalReport: text("radiological_report"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
