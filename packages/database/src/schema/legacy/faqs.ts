import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const faqsLegacy = pgTable("faqs", {
  id: integer("id").primaryKey(),
  ques: text("ques"),
  ans: text("ans"),
  file: text("file"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  deletedAt: timestamp("deleted_at"),
  isActive: boolean("is_active").default(true),
  order: integer("order").default(0),
});
