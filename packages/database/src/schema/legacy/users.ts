import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const usersLegacy = pgTable("users", {
  id: integer("id").primaryKey(),
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
  isActive: boolean("is_active").default(true).notNull(),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const otps = pgTable("otps", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  otp: text("otp").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
