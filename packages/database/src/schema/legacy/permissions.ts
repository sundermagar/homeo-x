import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const permissionsLegacy = pgTable("permissions", {
  id: integer("id").notNull(),
  name: text("name").notNull(),
  slug: text("slug"),
  module: text("module"),
  displayName: text("display_name").notNull(),
  description: text("description").notNull(),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
