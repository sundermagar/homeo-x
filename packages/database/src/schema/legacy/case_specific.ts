import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const caseSpecificLegacy = pgTable("case_specific", {
  id: integer("id").notNull(),
  randId: integer("rand_id"),
  regid: integer("regid"),
  dateval: text("dateval"),
  otherFindings: text("other_findings"),
  defineField1: text("define_field1"),
  defineField2: text("define_field2"),
  defineField3: text("define_field3"),
  defineField4: text("define_field4"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
