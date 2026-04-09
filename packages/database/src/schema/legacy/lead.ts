import { pgTable, integer, date, text, timestamp } from "drizzle-orm/pg-core";

export const leadLegacy = pgTable("lead", {
  id: integer("id").notNull(),
  assignedTo: integer("assigned_to"),
  defaultDate: date("default_date"),
  name: text("name"),
  address: text("address"),
  city: text("city"),
  email: text("email"),
  age: text("age"),
  sex: text("sex"),
  phoneNo: text("phone_no"),
  source: text("source"),
  treatment: text("treatment"),
  reminder: date("reminder"),
  status: text("status"),
  leadtype: text("leadtype"),
  documented: text("documented"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
