import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const casePotencies1Legacy = pgTable("case_potencies1", {
  id: integer("id").notNull(),
  regid: integer("regid"),
  randId: text("rand_id"),
  dateval: text("dateval"),
  todate: text("todate"),
  rxdays: integer("rxdays"),
  rxfrequency: integer("rxfrequency"),
  rxremedy: integer("rxremedy"),
  rxpotency: integer("rxpotency"),
  rxprescription: text("rxprescription"),
  charges: text("charges"),
  additionalName: text("additional_name"),
  additionalPrice: integer("additional_price"),
  receivedPrice: integer("received_price"),
  receivedDate: text("received_date"),
  callStatus: text("call_status"),
  callDate: text("call_date"),
  deletedAt: text("deleted_at"),
  updatedAt: timestamp("updated_at"),
  createdAt: timestamp("created_at"),
});
