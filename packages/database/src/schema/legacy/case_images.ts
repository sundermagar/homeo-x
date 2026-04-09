import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const caseImagesLegacy = pgTable("case_images", {
  id: integer("id").notNull(),
  regid: integer("regid"),
  picture: text("picture"),
  randId: text("rand_id"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  image: text("image"),
  type: text("type"),
  deletedAt: timestamp("deleted_at"),
});
