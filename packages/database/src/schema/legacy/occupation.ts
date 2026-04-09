import { pgTable, integer, text } from "drizzle-orm/pg-core";

export const occupationLegacy = pgTable("occupation", {
  id: integer("id").notNull(),
  occupation: text("occupation"),
});
