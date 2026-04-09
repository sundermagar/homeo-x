import { pgTable, integer, text } from "drizzle-orm/pg-core";

export const tempAppliedchargesLegacy = pgTable("temp_appliedcharges", {
  ID: integer("ID"),
  ChargesDate: text("ChargesDate"),
  PersonalID: integer("PersonalID"),
  ChargesID: integer("ChargesID"),
  Amount: integer("Amount"),
});
