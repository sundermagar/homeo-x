import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";

export const cashDepositLegacy = pgTable("cash_deposit", {
  id: serial("id").primaryKey(),
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
}, (table) => {
  return {
    depositDateIdx: index('idx_cash_deposit_date').on(table.depositDate),
    datevalIdx: index('idx_cash_dateval').on(table.dateval),
    deletedIdx: index('idx_cash_deleted').on(table.deletedAt),
  };
});
