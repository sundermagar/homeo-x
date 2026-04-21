import { pgTable, integer, text, date, timestamp } from "drizzle-orm/pg-core";

export const organizationsLegacy = pgTable("organizations", {
  id: integer("id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  website: text("website").notNull(),
  assignedTo: integer("assigned_to").notNull(),
  connectSince: date("connect_since").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  description: text("description").notNull(),
  adminEmail: text("admin_email").notNull(),
  adminPassword: text("admin_password").notNull(),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
