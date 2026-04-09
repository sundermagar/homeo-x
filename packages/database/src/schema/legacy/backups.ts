import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const backupsLegacy = pgTable("backups", {
  id: integer("id").notNull(),
  name: text("name").notNull(),
  fileName: text("file_name").notNull(),
  backupSize: text("backup_size").notNull(),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
