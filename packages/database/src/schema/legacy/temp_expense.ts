import { pgTable, integer, text } from "drizzle-orm/pg-core";

export const tempExpenseLegacy = pgTable("temp_expense", {
  ID: integer("ID").notNull(),
  ExpensesDate: text("ExpensesDate"),
  ExpensesHeadID: text("ExpensesHeadID"),
  Amount: text("Amount"),
  Detail: text("Detail"),
});
