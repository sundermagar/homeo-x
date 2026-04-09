import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const chatsLegacy = pgTable("chats", {
  id: integer("id").notNull(),
  userid: integer("userid").notNull(),
  username: text("username").notNull(),
  message: text("message").notNull(),
  chatDate: text("chat_date"),
  chatTime: text("chat_time"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at"),
  deletedAt: text("deleted_at"),
});
