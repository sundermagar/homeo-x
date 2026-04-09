import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const uploadPictureLegacy = pgTable("upload_picture", {
  id: integer("id").notNull(),
  regid: integer("regid").notNull(),
  randId: integer("rand_id").notNull(),
  picture: text("picture"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
