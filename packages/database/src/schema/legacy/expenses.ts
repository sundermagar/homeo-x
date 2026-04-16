import { pgTable, serial, integer, text, date, timestamp } from "drizzle-orm/pg-core";

export const expensesLegacy = pgTable("expenses", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id"),
  dateval: text("dateval"),
  expDate: date("exp_date"),
  head: integer("head"),
  amount: integer("amount"),
  detail: text("detail"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
