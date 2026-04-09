import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const dailyTargetLegacy = pgTable("daily_target", {
  id: integer("id").notNull(),
  cases: text("cases").notNull(),
  collection: text("collection").notNull(),
  dateval: text("dateval").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
