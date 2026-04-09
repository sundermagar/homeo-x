import { pgTable, integer, text } from "drizzle-orm/pg-core";

export const tempReceiptLegacy = pgTable("temp_receipt", {
  ID: integer("ID").notNull(),
  ReceiptDate: text("ReceiptDate"),
  PersonalID: integer("PersonalID"),
  Amount: text("Amount"),
  Mode: text("Mode"),
  IsSmsSend: text("IsSmsSend"),
});
