import { pgTable, real, text } from "drizzle-orm/pg-core";

export const rRemedyLegacy = pgTable("rRemedy", {
  ID: real("ID").notNull(),
  ShortName: text("ShortName"),
  Remedy: text("Remedy"),
  Thermal: real("Thermal"),
  AccuteThermal: real("AccuteThermal"),
  SideAffection: real("SideAffection"),
  Thirst: real("Thirst"),
  AccuteThirst: real("AccuteThirst"),
  CommonName: text("CommonName"),
  ClassificationID: real("ClassificationID"),
  SubClass1ID: real("SubClass1ID"),
  SubClass2ID: real("SubClass2ID"),
  Family1ID: real("Family1ID"),
  Family2ID: real("Family2ID"),
  Miasm: text("Miasm"),
});
