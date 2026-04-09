import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const departmentsLegacy = pgTable("departments", {
  id: integer("id").notNull(),
  name: text("name").notNull(),
  detail: text("detail"),
  tags: text("tags").notNull(),
  color: text("color").notNull(),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
