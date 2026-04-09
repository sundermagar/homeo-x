import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const courierMedicineLegacy = pgTable("courier_medicine", {
  id: integer("id").notNull(),
  caseId: integer("case_id").notNull(),
  regid: integer("regid"),
  randId: text("rand_id").notNull(),
  currentdate: text("currentdate").notNull(),
  remedy: text("remedy"),
  potency: text("potency"),
  frequency: text("frequency"),
  days: text("days"),
  pcd: text("pcd"),
  courier: text("courier"),
  pickup: integer("pickup").notNull(),
  postType: text("post_type").notNull(),
  isAssign: integer("is_assign").notNull(),
  readType: text("read_type").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
