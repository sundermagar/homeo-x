import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const rubricsLegacy = pgTable("rubrics", {
  id: integer("id").notNull(),
  category: text("category"),
  description: text("description"),
  chapter: text("chapter"),
  createdAt: timestamp("created_at"),
});
