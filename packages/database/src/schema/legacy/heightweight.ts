import { pgTable, integer, text, real } from "drizzle-orm/pg-core";

export const heightweightLegacy = pgTable("heightweight", {
  id: integer("id"),
  months: integer("months"),
  gender: text("gender"),
  height: real("height"),
  weight: real("weight"),
});
