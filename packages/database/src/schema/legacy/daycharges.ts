import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const daychargesLegacy = pgTable("daycharges", {
  id: integer("id").notNull(),
  days: text("days"),
  regularCharges: integer("regular_charges"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
