import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const familygroupLegacy = pgTable("familygroup", {
  id: integer("id").notNull(),
  regid: integer("regid"),
  familyRegid: integer("family_regid"),
  name: text("name"),
  surname: text("surname"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
