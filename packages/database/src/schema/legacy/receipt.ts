import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const receiptLegacy = pgTable("receipt", {
  id: integer("id").notNull(),
  receiptdate: text("receiptdate"),
  dateval: text("dateval"),
  regid: integer("regid"),
  amount: text("amount"),
  mode: text("mode"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
