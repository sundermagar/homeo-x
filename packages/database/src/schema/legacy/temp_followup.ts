import { pgTable, integer, text } from "drizzle-orm/pg-core";

export const tempFollowupLegacy = pgTable("temp_followup", {
  ID: integer("ID"),
  FollowupDate: text("FollowupDate"),
  PersonalID: text("PersonalID"),
  RemedyID: text("RemedyID"),
  PotencyID: text("PotencyID"),
  FrequencyID: text("FrequencyID"),
  DaysID: text("DaysID"),
  DiseaseID: text("DiseaseID"),
  Evaluation: text("Evaluation"),
  Additional: text("Additional"),
  WaitTime: text("WaitTime"),
  MedicineMethod: text("MedicineMethod"),
  POD: text("POD"),
  MedicineGiven: text("MedicineGiven"),
  CourierCompany: text("CourierCompany"),
});
