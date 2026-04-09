import { pgTable, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const modulesLegacy = pgTable("modules", {
  id: integer("id").notNull(),
  name: text("name").notNull(),
  label: text("label").notNull(),
  nameDb: text("name_db").notNull(),
  viewCol: text("view_col").notNull(),
  model: text("model").notNull(),
  controller: text("controller").notNull(),
  faIcon: text("fa_icon").notNull(),
  isGen: boolean("is_gen").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
