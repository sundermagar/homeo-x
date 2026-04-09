import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const roleModuleFieldsLegacy = pgTable("role_module_fields", {
  id: integer("id").notNull(),
  roleId: integer("role_id").notNull(),
  fieldId: integer("field_id").notNull(),
  access: text("access").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
