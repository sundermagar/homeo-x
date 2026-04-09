import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const caseUsgmaleLegacy = pgTable("case_usgmale", {
  id: integer("id").notNull(),
  randId: integer("rand_id"),
  regid: integer("regid"),
  dateval: text("dateval"),
  size: text("size"),
  volume: text("volume"),
  serumPsa: text("serum_psa"),
  otherFindings: text("other_findings"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
