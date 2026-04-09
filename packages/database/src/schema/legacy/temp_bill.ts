import { pgTable, integer, text } from "drizzle-orm/pg-core";

export const tempBillLegacy = pgTable("temp_bill", {
  ID: integer("ID"),
  PersonalID: integer("PersonalID"),
  Treatment: text("Treatment"),
  Disease: text("Disease"),
  FromDate: text("FromDate"),
  ToDate: text("ToDate"),
  Rupess: integer("Rupess"),
  BillNo: integer("BillNo"),
  DoctorID: integer("DoctorID"),
  RupeesInAmount: text("RupeesInAmount"),
  Days: text("Days"),
  BillDate: text("BillDate"),
  Charges: integer("Charges"),
  Received: integer("Received"),
  Balance: integer("Balance"),
  BalanceInAmount: text("BalanceInAmount"),
  ReceivedInAmount: text("ReceivedInAmount"),
});
