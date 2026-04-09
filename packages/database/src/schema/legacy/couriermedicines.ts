import { pgTable, integer, jsonb, date, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const couriermedicinesLegacy = pgTable("couriermedicines", {
  id: integer("id").notNull(),
  courierId: integer("courier_id").notNull(),
  regid: integer("regid").notNull(),
  medicineIds: jsonb("medicine_ids"),
  dispatchDate: date("dispatch_date"),
  trackingNo: text("tracking_no"),
  status: text("status"),
  notified: boolean("notified"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
