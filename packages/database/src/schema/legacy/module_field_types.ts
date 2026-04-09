import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const moduleFieldTypesLegacy = pgTable("module_field_types", {
  id: integer("id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
