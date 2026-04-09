import { pgTable, integer, timestamp } from "drizzle-orm/pg-core";

export const rubricRemidMappingLegacy = pgTable("rubric_remid_mapping", {
  id: integer("id").notNull(),
  regid: integer("regid"),
  remid: integer("remid"),
  weight: integer("weight"),
  createdAt: timestamp("created_at"),
});
