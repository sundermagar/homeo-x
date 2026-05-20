ALTER TABLE wa_ai_settings ADD COLUMN IF NOT EXISTS response_config JSONB DEFAULT '{"tone":"Friendly","length":"Medium (~200 words)","fallback":"I''m sorry, I don''t have the information you''re looking for."}'::jsonb;
ALTER TABLE wa_ai_settings ADD COLUMN IF NOT EXISTS train_from_kb BOOLEAN DEFAULT false;
