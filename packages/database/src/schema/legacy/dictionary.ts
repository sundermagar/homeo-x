import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const dictionaryLegacy = pgTable("dictionary", {
  id: integer("id").notNull(),
  title: text("title"),
  text: text("text"),
  comments: text("comments"),
  crossRef: text("cross_ref"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
