import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const managetreedatasLegacy = pgTable("managetreedatas", {
  id: integer("id").notNull(),
  label: text("label"),
  parentId: integer("parent_id"),
  hindiLabel: text("hindi_label"),
  gujratiLabel: text("gujrati_label"),
  punjabiLabel: text("punjabi_label"),
  malyalumLabel: text("malyalum_label"),
  kannadLabel: text("kannad_label"),
  bengaliLabel: text("bengali_label"),
  marathiLabel: text("marathi_label"),
  frenchLabel: text("french_label"),
  germanLabel: text("german_label"),
  spanishLabel: text("spanish_label"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
