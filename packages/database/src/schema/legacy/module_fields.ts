import { pgTable, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const moduleFieldsLegacy = pgTable("module_fields", {
  id: integer("id").notNull(),
  colname: text("colname").notNull(),
  label: text("label").notNull(),
  module: integer("module").notNull(),
  fieldType: integer("field_type").notNull(),
  unique: boolean("unique").notNull(),
  defaultvalue: text("defaultvalue").notNull(),
  minlength: integer("minlength").notNull(),
  maxlength: integer("maxlength").notNull(),
  required: boolean("required").notNull(),
  popupVals: text("popup_vals").notNull(),
  sort: integer("sort").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
