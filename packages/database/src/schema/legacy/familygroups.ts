import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const familygroupsLegacy = pgTable("familygroups", {
  id: integer("id").notNull(),
  regid: integer("regid").notNull(),
  memberRegid: integer("member_regid").notNull(),
  relation: text("relation"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
