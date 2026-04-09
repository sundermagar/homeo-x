import { pgTable, bigint, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const mkQuestionsLegacy = pgTable("mk_questions", {
  id: bigint("id", { mode: "number" }).notNull(),
  questionTitle: text("question_title"),
  questionDesc: text("question_desc"),
  isRequired: boolean("is_required").notNull(),
  status: boolean("status").notNull(),
  order: bigint("order", { mode: "number" }),
  metaData: text("meta_data"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
