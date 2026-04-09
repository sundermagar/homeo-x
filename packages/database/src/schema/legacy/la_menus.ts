import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const laMenusLegacy = pgTable("la_menus", {
  id: integer("id").notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  icon: text("icon").notNull(),
  type: text("type").notNull(),
  parent: integer("parent").notNull(),
  hierarchy: integer("hierarchy").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
