import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const couponLegacy = pgTable("coupon", {
  id: integer("id").notNull(),
  regid: integer("regid"),
  couponTitle: text("coupon_title").notNull(),
  couponAmount: text("coupon_amount").notNull(),
  expireDate: text("expire_date").notNull(),
  status: text("status"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
