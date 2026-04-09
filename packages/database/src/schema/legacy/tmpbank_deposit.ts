import { pgTable, real, text } from "drizzle-orm/pg-core";

export const tmpbankDepositLegacy = pgTable("tmpbank_deposit", {
  ID: real("ID"),
  RecordDate: text("RecordDate"),
  CashBalance: text("CashBalance"),
  BankDeposit: text("BankDeposit"),
  Comments: text("Comments"),
  Submitted: text("Submitted"),
  DateOfSubmission: text("DateOfSubmission"),
});
