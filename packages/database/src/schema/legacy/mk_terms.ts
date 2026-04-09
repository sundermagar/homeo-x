import { pgTable, integer, bigint, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const mkTermsLegacy = pgTable("mk_terms", {
  id: integer("id").notNull(),
  termId: bigint("term_id", { mode: "number" }).notNull(),
  userId: bigint("user_id", { mode: "number" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  order: bigint("order", { mode: "number" }).notNull(),
  termType: text("term_type"),
  description: text("description"),
  parent: bigint("parent", { mode: "number" }),
  termStatus: boolean("term_status"),
  featuredImage: text("featured_image"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
