import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const refrencetypeLegacy = pgTable("refrencetype", {
  id: integer("id").notNull(),
  referencetype: text("referencetype"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
