import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const packagesLegacy = pgTable("packages", {
  id: integer("id").notNull(),
  name: text("name"),
  tags: text("tags"),
  color: text("color"),
  expiryDate: text("expiry_date"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
