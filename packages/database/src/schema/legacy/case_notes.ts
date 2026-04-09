import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const caseNotesLegacy = pgTable("case_notes", {
  id: integer("id").notNull(),
  regid: integer("regid"),
  notes: text("notes"),
  notesType: text("notes_type"),
  randId: text("rand_id"),
  dateval: text("dateval"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
