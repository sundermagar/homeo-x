import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const booksLegacy = pgTable("books", {
  id: integer("id").notNull(),
  title: text("title"),
  file: text("file"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
