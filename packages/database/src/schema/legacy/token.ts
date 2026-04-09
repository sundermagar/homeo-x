import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const tokenLegacy = pgTable("token", {
  id: integer("id").notNull(),
  clinicId: integer("clinic_id"),
  regid: integer("regid"),
  dateval: text("dateval"),
  rowcolor: integer("rowcolor"),
  tokenNo: integer("token_no"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
  status: text("status"),
});
