import { pgTable, integer, text } from "drizzle-orm/pg-core";

export const tempHeightweightLegacy = pgTable("temp_heightweight", {
  ID: integer("ID"),
  RegID: integer("RegID"),
  RecordDate: text("RecordDate"),
  Height: text("Height"),
  Weight: text("Weight"),
});
