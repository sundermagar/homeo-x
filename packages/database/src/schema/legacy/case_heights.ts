import { pgTable, integer, date, real, text, timestamp } from "drizzle-orm/pg-core";

export const caseHeightsLegacy = pgTable("case_heights", {
  id: integer("id").notNull(),
  regid: integer("regid").notNull(),
  randId: integer("rand_id"),
  dob: date("dob"),
  height: real("height"),
  weight: real("weight"),
  bloodPressure: text("blood_pressure"),
  bloodPressure2: text("blood_pressure2"),
  lmp: text("lmp"),
  deletedAt: timestamp("deleted_at"),
  updatedAt: timestamp("updated_at"),
  createdAt: timestamp("created_at"),
  pulse: text("pulse"),
  temperature: text("temperature"),
});
