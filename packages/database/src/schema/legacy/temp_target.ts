import { pgTable, integer, text } from "drizzle-orm/pg-core";

export const tempTargetLegacy = pgTable("temp_target", {
  ID: integer("ID"),
  TargetMonth: text("TargetMonth"),
  NewCase: integer("NewCase"),
  Collection: integer("Collection"),
});
