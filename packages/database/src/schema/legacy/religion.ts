import { pgTable, integer, text } from "drizzle-orm/pg-core";

export const religionLegacy = pgTable("religion", {
  id: integer("id").notNull(),
  religion: text("religion"),
});
