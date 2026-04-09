import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const communicationDetailsLegacy = pgTable("communication_details", {
  id: integer("id").notNull(),
  regid: integer("regid").notNull(),
  randId: integer("rand_id"),
  currentdate: text("currentdate").notNull(),
  complaintIntesity: text("complaint_intesity"),
  complaintIntesity1: text("complaint_intesity1"),
  complaintIntesity2: text("complaint_intesity2"),
  deletedAt: timestamp("deleted_at"),
  updatedAt: timestamp("updated_at"),
  createdAt: timestamp("created_at"),
});
