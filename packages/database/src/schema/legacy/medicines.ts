import { pgTable, integer, text } from "drizzle-orm/pg-core";

export const medicinesLegacy = pgTable("medicines", {
  ID: integer("ID"),
  shortname: text("shortname"),
  remedy: text("remedy"),
});
