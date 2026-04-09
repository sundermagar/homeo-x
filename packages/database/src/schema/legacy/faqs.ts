import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const faqsLegacy = pgTable("faqs", {
  id: integer("id").notNull(),
  ques: text("ques"),
  ans: text("ans"),
  file: text("file"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  deletedAt: timestamp("deleted_at").notNull(),
});
