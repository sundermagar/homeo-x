import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const knexMigrationsLegacy = pgTable("knex_migrations", {
  id: integer("id").notNull(),
  name: text("name"),
  batch: integer("batch"),
  migrationTime: timestamp("migration_time"),
});
