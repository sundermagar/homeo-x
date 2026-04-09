import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const courierPackageListLegacy = pgTable("courier_package_list", {
  id: integer("id").notNull(),
  packageId: integer("package_id").notNull(),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull(),
  price: text("price").notNull(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
