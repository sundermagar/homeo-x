import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const smsreportLegacy = pgTable("smsreport", {
  id: integer("id").notNull(),
  regid: integer("regid").notNull(),
  sendDate: text("send_date").notNull(),
  smsType: text("sms_type").notNull(),
  message: text("message"),
  phone: text("phone"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
