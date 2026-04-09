import { pgTable, integer, text } from "drizzle-orm/pg-core";

export const tempDepositLegacy = pgTable("temp_deposit", {
  ID: integer("ID"),
  RecordDate: text("RecordDate"),
  CashBalance: text("CashBalance"),
  BankDeposit: text("BankDeposit"),
  Comments: text("Comments"),
  Submitted: text("Submitted"),
  DateOfSubmission: text("DateOfSubmission"),
});
