import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const packagehistoryLegacy = pgTable("packagehistory", {
  id: integer("id").notNull(),
  packagedate: text("packagedate"),
  regid: integer("regid"),
  fromdate: text("fromdate"),
  todate: text("todate"),
  packageid: integer("packageid"),
  PackagePeriodID: integer("PackagePeriodID"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
