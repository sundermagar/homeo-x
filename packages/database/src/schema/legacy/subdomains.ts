import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const subdomainsLegacy = pgTable("subdomains", {
  id: integer("id").notNull(),
  name: text("name"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  updatedAt: timestamp("updated_at"),
  createdAt: timestamp("created_at"),
  deletedAt: timestamp("deleted_at"),
});
