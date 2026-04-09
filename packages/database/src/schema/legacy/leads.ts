import { pgTable, integer, text, date, timestamp } from "drizzle-orm/pg-core";

export const leadsLegacy = pgTable("leads", {
  id: integer("id").notNull(),
  name: text("name").notNull(),
  mobile: text("mobile"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  source: text("source"),
  status: text("status"),
  notes: text("notes"),
  assignedTo: integer("assigned_to"),
  followUpDate: date("follow_up_date"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
