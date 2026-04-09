import { pgTable, integer, text } from "drizzle-orm/pg-core";

export const diseasesLegacy = pgTable("diseases", {
  id: integer("id").notNull(),
  diseases: text("diseases"),
});
