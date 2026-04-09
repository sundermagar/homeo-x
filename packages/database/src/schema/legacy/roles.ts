import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const rolesLegacy = pgTable("roles", {
  id: integer("id").notNull(),
  name: text("name").notNull(),
  displayName: text("display_name").notNull(),
  description: text("description").notNull(),
  parent: integer("parent").notNull(),
  dept: integer("dept").notNull(),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
