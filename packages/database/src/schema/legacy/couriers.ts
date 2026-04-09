import { pgTable, integer, timestamp, text } from "drizzle-orm/pg-core";

export const couriersLegacy = pgTable("couriers", {
  id: integer("id").notNull(),
  packageId: integer("package_id").notNull(),
  totalNoPackage: integer("total_no_package").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
