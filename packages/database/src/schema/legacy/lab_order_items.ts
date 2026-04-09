import { pgTable, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const labOrderItemsLegacy = pgTable("lab_order_items", {
  id: integer("id").notNull(),
  labOrderId: integer("lab_order_id").notNull(),
  testName: text("test_name").notNull(),
  testCode: text("test_code"),
  category: text("category"),
  priority: text("priority"),
  status: text("status"),
  result: text("result"),
  resultValue: text("result_value"),
  referenceRange: text("reference_range"),
  unit: text("unit"),
  flag: text("flag"),
  resultAt: timestamp("result_at"),
  notes: text("notes"),
  aiSuggested: boolean("ai_suggested"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
