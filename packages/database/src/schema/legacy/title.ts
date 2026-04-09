import { pgTable, integer, text } from "drizzle-orm/pg-core";

export const titleLegacy = pgTable("title", {
  id: integer("id"),
  title: text("title"),
});
