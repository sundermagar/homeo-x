import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const mmcMedicinesLegacy = pgTable("mmc_medicines", {
  id: integer("id").notNull(),
  name: text("name"),
  detail: text("detail"),
  medicineName: text("medicine_name"),
  relatedDiseases: text("related_diseases"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
