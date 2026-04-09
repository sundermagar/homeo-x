import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const stocksLegacy = pgTable("stocks", {
  id: integer("id").notNull(),
  name: text("name"),
  description: text("description"),
  deletedAt: text("deleted_at"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  potency: text("potency"),
  ml: text("ml"),
  status: text("status"),
});
