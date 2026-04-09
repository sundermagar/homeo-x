import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const expensesheadLegacy = pgTable("expenseshead", {
  id: integer("id").notNull(),
  expenseshead: text("expenseshead"),
  shortName: text("short_name"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
