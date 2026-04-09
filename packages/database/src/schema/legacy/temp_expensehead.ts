import { pgTable, integer, text } from "drizzle-orm/pg-core";

export const tempExpenseheadLegacy = pgTable("temp_expensehead", {
  ID: integer("ID").notNull(),
  ExpensesHead: text("ExpensesHead"),
  ShortName: text("ShortName"),
});
