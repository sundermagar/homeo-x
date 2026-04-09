import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const labOrdersLegacy = pgTable("lab_orders", {
  id: integer("id").notNull(),
  tenantId: integer("tenant_id"),
  visitId: integer("visit_id").notNull(),
  patientId: integer("patient_id").notNull(),
  orderedBy: integer("ordered_by"),
  status: text("status"),
  notes: text("notes"),
  orderedAt: timestamp("ordered_at"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
