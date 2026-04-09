import { pgTable, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const roleModuleLegacy = pgTable("role_module", {
  id: integer("id").notNull(),
  roleId: integer("role_id").notNull(),
  moduleId: integer("module_id").notNull(),
  accView: boolean("acc_view").notNull(),
  accCreate: boolean("acc_create").notNull(),
  accEdit: boolean("acc_edit").notNull(),
  accDelete: boolean("acc_delete").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
