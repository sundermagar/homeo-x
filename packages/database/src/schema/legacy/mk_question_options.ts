import { pgTable, bigint, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const mkQuestionOptionsLegacy = pgTable("mk_question_options", {
  id: bigint("id", { mode: "number" }).notNull(),
  title: text("title"),
  value: text("value"),
  description: text("description"),
  status: boolean("status").notNull(),
  order: bigint("order", { mode: "number" }),
  questionId: bigint("question_id", { mode: "number" }),
  createdAt: timestamp("created_at"),
});
