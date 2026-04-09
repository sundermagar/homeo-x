import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const caseSemenanalysisLegacy = pgTable("case_semenanalysis", {
  id: integer("id").notNull(),
  randId: integer("rand_id"),
  regid: integer("regid"),
  dateval: text("dateval"),
  semenAnalysis: text("semen_analysis"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
