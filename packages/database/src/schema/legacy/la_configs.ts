import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const laConfigsLegacy = pgTable("la_configs", {
  id: integer("id").notNull(),
  key: text("key").notNull(),
  section: text("section").notNull(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
