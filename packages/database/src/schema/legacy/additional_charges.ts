import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const additionalChargesLegacy = pgTable("additional_charges", {
  id: integer("id").notNull(),
  regid: integer("regid"),
  randId: text("rand_id"),
  dateval: text("dateval"),
  additionalName: text("additional_name"),
  additionalPrice: integer("additional_price"),
  additionalQuantity: integer("additional_quantity"),
  receivedPrice: integer("received_price"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
