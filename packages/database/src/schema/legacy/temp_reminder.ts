import { pgTable, integer, text } from "drizzle-orm/pg-core";

export const tempReminderLegacy = pgTable("temp_reminder", {
  id: integer("id"),
  patientName: text("patient_name"),
  startDate: text("start_date"),
  heading: text("heading"),
  comments: text("comments"),
  Done: text("Done"),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
  deletedAt: text("deleted_at"),
});
