import { pgTable, integer, text, timestamp, serial } from "drizzle-orm/pg-core";

export const expensesheadLegacy = pgTable("expenseshead", {
  id: serial("id").primaryKey(),
  expenseshead: text("expenseshead"),
  shortName: text("short_name"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
