import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const caseCardiacLegacy = pgTable("case_cardiac", {
  id: integer("id").notNull(),
  randId: integer("rand_id"),
  regid: integer("regid"),
  dateval: text("dateval"),
  homocysteine: text("homocysteine"),
  ecg: text("ecg"),
  decho: text("decho"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
