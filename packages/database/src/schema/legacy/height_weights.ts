import { pgTable, integer, timestamp, text } from "drizzle-orm/pg-core";

export const heightWeightsLegacy = pgTable("height_weights", {
  id: integer("id").notNull(),
  regid: integer("regid").notNull(),
  randId: integer("rand_id"),
  dob: timestamp("dob").notNull(),
  height: text("height"),
  weight: text("weight"),
  bloodPressure: text("blood_pressure"),
  lmp: text("lmp"),
  deletedAt: timestamp("deleted_at").notNull(),
  updatedAt: timestamp("updated_at"),
  createdAt: timestamp("created_at"),
});
