import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const notesLegacy = pgTable("notes", {
  id: integer("id").notNull(),
  regid: integer("regid"),
  randId: integer("rand_id"),
  dateval: text("dateval"),
  notes: text("notes"),
  notesType: text("notes_type"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
