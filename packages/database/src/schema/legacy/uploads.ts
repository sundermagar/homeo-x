import { pgTable, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const uploadsLegacy = pgTable("uploads", {
  id: integer("id").notNull(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  extension: text("extension").notNull(),
  caption: text("caption").notNull(),
  userId: integer("user_id").notNull(),
  hash: text("hash").notNull(),
  public: boolean("public").notNull(),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
