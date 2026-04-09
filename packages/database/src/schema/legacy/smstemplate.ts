import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const smstemplateLegacy = pgTable("smstemplate", {
  id: integer("id").notNull(),
  templatename: text("templatename").notNull(),
  message: text("message"),
  smstype: text("smstype"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
