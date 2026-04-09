import { pgTable, integer, text } from "drizzle-orm/pg-core";

export const statusLegacy = pgTable("status", {
  id: integer("id").notNull(),
  status: text("status"),
});
