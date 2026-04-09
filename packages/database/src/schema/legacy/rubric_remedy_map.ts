import { pgTable, integer } from "drizzle-orm/pg-core";

export const rubricRemedyMapLegacy = pgTable("rubric_remedy_map", {
  id: integer("id").notNull(),
  rubricId: integer("rubric_id"),
  remedyId: integer("remedy_id"),
  weight: integer("weight"),
});
