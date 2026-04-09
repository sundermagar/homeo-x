import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const caseFrequencyLegacy = pgTable("case_frequency", {
  id: integer("id").notNull(),
  title: text("title"),
  duration: text("duration"),
  days: integer("days"),
  frequency: text("frequency"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
