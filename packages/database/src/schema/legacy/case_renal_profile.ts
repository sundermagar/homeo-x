import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const caseRenalProfileLegacy = pgTable("case_renal_profile", {
  id: integer("id").notNull(),
  randId: integer("rand_id"),
  regid: integer("regid"),
  dateval: text("dateval"),
  bun: text("bun"),
  urea: text("urea"),
  creatinine: text("creatinine"),
  uricAcid: text("uric_acid"),
  calcium: text("calcium"),
  phosphorus: text("phosphorus"),
  sodium: text("sodium"),
  potassium: text("potassium"),
  chloride: text("chloride"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
