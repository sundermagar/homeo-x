import { pgTable, integer } from "drizzle-orm/pg-core";

export const permissionRoleLegacy = pgTable("permission_role", {
  permissionId: integer("permission_id").notNull(),
  roleId: integer("role_id").notNull(),
});
