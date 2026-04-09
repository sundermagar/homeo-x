import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const testUsersLegacy = pgTable("test_users", {
  id: integer("id").notNull(),
  jobtitle: text("jobtitle").notNull(),
  email: text("email").notNull(),
  mobile: text("mobile").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
