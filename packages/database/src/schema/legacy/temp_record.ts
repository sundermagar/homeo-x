import { pgTable, integer, text, bigint } from "drizzle-orm/pg-core";

export const tempRecordLegacy = pgTable("temp_record", {
  ID: integer("ID"),
  CallDate: text("CallDate"),
  RegID: text("RegID"),
  CallerName: text("CallerName"),
  Mobile1: bigint("Mobile1", { mode: "number" }),
  Mobile2: text("Mobile2"),
  Instructions: text("Instructions"),
  CallType: text("CallType"),
  CallTime: text("CallTime"),
  Done: text("Done"),
});
