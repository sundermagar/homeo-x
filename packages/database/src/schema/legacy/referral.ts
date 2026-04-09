import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const referralLegacy = pgTable("referral", {
  id: integer("id").notNull(),
  regid: integer("regid"),
  referralId: text("referral_id"),
  totalAmount: text("total_amount"),
  usedAmount: text("used_amount"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
