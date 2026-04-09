import { pgTable, integer } from "drizzle-orm/pg-core";

export const knexMigrationsLockLegacy = pgTable("knex_migrations_lock", {
  index: integer("index").notNull(),
  isLocked: integer("is_locked"),
});
