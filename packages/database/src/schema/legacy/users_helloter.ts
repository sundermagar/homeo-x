import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const usersHelloterLegacy = pgTable("users_helloter", {
  id: integer("id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  password: text("password").notNull(),
  otp: text("otp"),
  emailVerifiedAt: timestamp("email_verified_at"),
  rememberToken: text("remember_token"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
