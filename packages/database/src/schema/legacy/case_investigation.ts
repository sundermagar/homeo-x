import { pgTable, integer, text, date, timestamp } from "drizzle-orm/pg-core";

export const caseInvestigationLegacy = pgTable("case_investigation", {
  id: integer("id").notNull(),
  regid: integer("regid").notNull(),
  randId: text("rand_id"),
  investDate: date("invest_date"),
  hb: text("hb"),
  t3: text("t3"),
  t4: text("t4"),
  tsh: text("tsh"),
  totalchol: text("totalchol"),
  hdichol: text("hdichol"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
