import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const askQuesLegacy = pgTable("ask_ques", {
  id: integer("id").notNull(),
  regid: integer("regid"),
  quesid: integer("quesid"),
  ansid: integer("ansid"),
  ans: text("ans"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  deletedAt: timestamp("deleted_at"),
});
