import { pgTable, integer, text, date, timestamp } from "drizzle-orm/pg-core";

export const staticpagesLegacy = pgTable("staticpages", {
  id: integer("id").notNull(),
  name: text("name").notNull(),
  url: text("url"),
  content: text("content"),
  phone: text("phone").notNull(),
  website: text("website").notNull(),
  assignedTo: integer("assigned_to").notNull(),
  connectSince: date("connect_since").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  description: text("description").notNull(),
  profileImage: integer("profile_image").notNull(),
  profile: integer("profile").notNull(),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
