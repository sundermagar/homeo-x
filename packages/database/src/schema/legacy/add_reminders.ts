import { pgTable, integer, timestamp, text } from "drizzle-orm/pg-core";

export const addRemindersLegacy = pgTable("add_reminders", {
  id: integer("id").notNull(),
  regid: integer("regid").notNull(),
  remindOn: timestamp("remind_on").notNull(),
  timepick: text("timepick"),
  heading: text("heading"),
  comments: text("comments"),
  deletedAt: timestamp("deleted_at").notNull(),
  updatedAt: timestamp("updated_at"),
  createdAt: timestamp("created_at"),
});
