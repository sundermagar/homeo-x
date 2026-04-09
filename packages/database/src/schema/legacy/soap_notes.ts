import { pgTable, integer, text, jsonb, boolean, real, timestamp } from "drizzle-orm/pg-core";

export const soapNotesLegacy = pgTable("soap_notes", {
  id: integer("id").notNull(),
  visitId: integer("visit_id").notNull(),
  subjective: text("subjective"),
  objective: text("objective"),
  assessment: text("assessment"),
  plan: text("plan"),
  advice: text("advice"),
  followUp: text("follow_up"),
  icdCodes: jsonb("icd_codes"),
  aiGenerated: boolean("ai_generated"),
  aiConfidence: real("ai_confidence"),
  doctorApproved: boolean("doctor_approved"),
  approvedAt: timestamp("approved_at"),
  specialtyData: jsonb("specialty_data"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
