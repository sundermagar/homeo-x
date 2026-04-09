import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const potencies1Legacy = pgTable("potencies1", {
  id: integer("id").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
