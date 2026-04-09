import { pgTable, integer, text, real, boolean, timestamp } from "drizzle-orm/pg-core";

export const aiPromptsLegacy = pgTable("ai_prompts", {
  id: integer("id").notNull(),
  name: text("name"),
  specialty: text("specialty"),
  version: integer("version"),
  systemPrompt: text("system_prompt"),
  userPromptTemplate: text("user_prompt_template"),
  temperature: real("temperature"),
  maxTokens: integer("max_tokens"),
  isActive: boolean("is_active"),
  createdAt: timestamp("created_at"),
});
