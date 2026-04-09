import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const vaccinedatasLegacy = pgTable("vaccinedatas", {
  id: integer("id").notNull(),
  label: text("label"),
  parentId: integer("parent_id"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
