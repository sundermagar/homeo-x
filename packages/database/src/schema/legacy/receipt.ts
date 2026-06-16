import { pgTable, integer, text, timestamp, index } from "drizzle-orm/pg-core";

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
}, (table) => {
  return {
    receiptDateIdx: index('idx_receipt_receiptdate').on(table.receiptdate),
    datevalIdx: index('idx_receipt_dateval').on(table.dateval),
    regidIdx: index('idx_receipt_regid').on(table.regid),
    modeIdx: index('idx_receipt_mode').on(table.mode),
    deletedIdx: index('idx_receipt_deleted').on(table.deletedAt),
  };
});
