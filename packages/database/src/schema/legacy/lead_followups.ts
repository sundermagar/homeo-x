import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const leadFollowupsLegacy = pgTable("lead_followups", {
  id: integer("id").notNull(),
  leadId: integer("lead_id").notNull(),
  name: text("name"),
  attachments: text("attachments"),
  task: text("task"),
  taskstatus: text("taskstatus"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});
