import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const caseDiabetesLegacy = pgTable("case_diabetes", {
  id: integer("id").notNull(),
  randId: integer("rand_id"),
  regid: integer("regid"),
  dateval: text("dateval"),
  bloodFasting: text("blood_fasting"),
  bloodPrandial: text("blood_prandial"),
  bloodRandom: text("blood_random"),
  urineFasting: text("urine_fasting"),
  urinePrandial: text("urine_prandial"),
  urineRandom: text("urine_random"),
  gluTest: text("glu_test"),
  glycosylatedHb: text("glycosylated_hb"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
