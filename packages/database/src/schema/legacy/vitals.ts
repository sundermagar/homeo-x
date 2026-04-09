import { pgTable, integer, real, text, timestamp } from "drizzle-orm/pg-core";

export const vitalsLegacy = pgTable("vitals", {
  id: integer("id").notNull(),
  visitId: integer("visit_id").notNull(),
  heightCm: real("height_cm"),
  weightKg: real("weight_kg"),
  bmi: real("bmi"),
  temperatureF: real("temperature_f"),
  pulseRate: integer("pulse_rate"),
  systolicBp: integer("systolic_bp"),
  diastolicBp: integer("diastolic_bp"),
  respiratoryRate: integer("respiratory_rate"),
  oxygenSaturation: real("oxygen_saturation"),
  bloodSugar: real("blood_sugar"),
  notes: text("notes"),
  recordedAt: timestamp("recorded_at"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
