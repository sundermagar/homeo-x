import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const bankDepositLegacy = pgTable("bank_deposit", {
  id: integer("id").notNull(),
  clinicId: integer("clinic_id"),
  depositDate: text("deposit_date").notNull(),
  dateval: text("dateval"),
  amount: text("amount"),
  remark: text("remark"),
  bankdeposit: text("bankdeposit"),
  comments: text("comments"),
  submitted: text("submitted"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
