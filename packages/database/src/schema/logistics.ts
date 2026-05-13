import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { patients } from "./patients";

export const logisticsStatusEnum = pgEnum("logistics_status", ["PENDING", "DISPATCHED", "DELIVERED", "COLLECTED"]);
export const logisticsTypeEnum = pgEnum("logistics_type", ["COURIER", "PICKUP"]);

export const logisticsShipments = pgTable("logistics_shipments", {
  id: serial("id").primaryKey(),
  regid: integer("regid").notNull().references(() => patients.regid),
  type: logisticsTypeEnum("type").notNull().default("COURIER"),
  status: logisticsStatusEnum("status").notNull().default("PENDING"),
  
  // Courier specific fields
  carrierName: text("carrier_name"),
  trackingNumber: text("tracking_number"),
  dispatchDate: timestamp("dispatch_date"),
  
  // Pickup specific fields
  pickupDate: timestamp("pickup_date"),
  
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});
