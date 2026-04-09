import { pgTable, bigint } from "drizzle-orm/pg-core";

export const mkQuestionRelationLegacy = pgTable("mk_question_relation", {
  id: bigint("id", { mode: "number" }).notNull(),
  termId: bigint("term_id", { mode: "number" }),
  questionId: bigint("question_id", { mode: "number" }),
});
