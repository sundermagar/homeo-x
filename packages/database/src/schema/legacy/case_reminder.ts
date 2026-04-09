import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const caseReminderLegacy = pgTable("case_reminder", {
  id: integer("id").notNull(),
  clinicId: integer("clinic_id"),
  patientId: integer("patient_id"),
  patientName: text("patient_name").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  remindTime: text("remind_time").notNull(),
  recursion: integer("recursion"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
  remindAfter: text("remind_after").notNull(),
  heading: text("heading").notNull(),
  comments: text("comments").notNull(),
  status: text("status").notNull(),
});
