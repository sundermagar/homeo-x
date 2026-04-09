import { pgTable, integer, timestamp } from "drizzle-orm/pg-core";

export const roleUserLegacy = pgTable("role_user", {
  id: integer("id").notNull(),
  roleId: integer("role_id").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
