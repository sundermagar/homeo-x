import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const testAnsLegacy = pgTable("test_ans", {
  id: integer("id").notNull(),
  quesid: integer("quesid").notNull(),
  ans: text("ans"),
  a: text("a"),
  b: text("b"),
  c: text("c"),
  d: text("d"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  deletedAt: timestamp("deleted_at").notNull(),
});
