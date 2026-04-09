import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const usersLegacy = pgTable("users", {
  id: integer("id").notNull(),
  name: text("name").notNull(),
  contextId: integer("context_id").notNull(),
  email: text("email").notNull(),
  password: text("password").notNull(),
  type: text("type").notNull(),
  gender: text("gender"),
  mobile: text("mobile"),
  city: text("city"),
  address: text("address"),
  about: text("about"),
  rememberToken: text("remember_token"),
  amount: text("amount"),
  planName: text("plan_name"),
  unread: integer("unread"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
