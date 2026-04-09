import { pgTable, integer, text } from "drizzle-orm/pg-core";

export const tempPersonalnewLegacy = pgTable("temp_personalnew", {
  ID: integer("ID").notNull(),
  RegID: text("RegID"),
  DateOfLastUpdate: text("DateOfLastUpdate"),
  Diagnosis: text("Diagnosis"),
  ComplaintIntensity: text("ComplaintIntensity"),
  MedicationTaking: text("MedicationTaking"),
  Investigation: text("Investigation"),
  Skin: text("Skin"),
  DisabilityDisorder: text("DisabilityDisorder"),
  PCOD: text("PCOD"),
  Tyroid: text("Tyroid"),
  LifestyleDisorder: text("LifestyleDisorder"),
});
