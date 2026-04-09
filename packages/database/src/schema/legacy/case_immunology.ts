import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const caseImmunologyLegacy = pgTable("case_immunology", {
  id: integer("id").notNull(),
  randId: integer("rand_id"),
  regid: integer("regid"),
  dateval: text("dateval"),
  igg: text("igg"),
  ige: text("ige"),
  igm: text("igm"),
  iga: text("iga"),
  itg: text("itg"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
