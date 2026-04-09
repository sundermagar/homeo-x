import { pgTable, text, integer } from "drizzle-orm/pg-core";

export const migrationsLegacy = pgTable("migrations", {
  migration: text("migration").notNull(),
  batch: integer("batch").notNull(),
});
