import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const testQuesLegacy = pgTable("test_ques", {
  id: integer("id").notNull(),
  ques: text("ques"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  deletedAt: timestamp("deleted_at").notNull(),
});
