import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const caseSerologicalReportsLegacy = pgTable("case_serological_reports", {
  id: integer("id").notNull(),
  randId: integer("rand_id"),
  regid: integer("regid"),
  dateval: text("dateval"),
  serologicalReport: text("serological_report"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
