import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const potenciesLegacy = pgTable("potencies", {
  id: integer("id").notNull(),
  name: text("name"),
  detail: text("detail"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
