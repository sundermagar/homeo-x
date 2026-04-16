import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const daychargesLegacy = pgTable("daycharges", {
  id: serial("id").primaryKey(),
  days: text("days"),
  regularCharges: integer("regular_charges"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
