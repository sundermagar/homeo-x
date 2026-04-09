import { pgTable, integer, text } from "drizzle-orm/pg-core";

export const chargesLegacy = pgTable("charges", {
  id: integer("id").notNull(),
  charges: text("charges"),
  amount: integer("amount"),
  quantity: integer("quantity"),
  type: text("type"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
});
