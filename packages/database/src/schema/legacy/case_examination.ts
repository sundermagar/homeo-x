import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const caseExaminationLegacy = pgTable("case_examination", {
  id: integer("id").notNull(),
  regid: integer("regid").notNull(),
  randId: integer("rand_id").notNull(),
  examinationDate: text("examination_date").notNull(),
  bp1: integer("bp1").notNull(),
  bp2: integer("bp2").notNull(),
  examination: text("examination").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
