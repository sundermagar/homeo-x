import { pgTable, integer, text } from "drizzle-orm/pg-core";

export const pdfContentLegacy = pgTable("pdf_content", {
  id: integer("id").notNull(),
  name: text("name"),
  tagLine: text("tag_line"),
  tagLine1: text("tag_line1"),
  logo: text("logo"),
  address1: text("address1"),
  address2: text("address2"),
  address3: text("address3"),
  address4: text("address4"),
});
