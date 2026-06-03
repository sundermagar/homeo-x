-- Migration: Add AI chatbot settings and training tables
-- Creates wa_ai_settings, wa_training_sources, wa_training_chunks, wa_training_qa_pairs

CREATE TABLE IF NOT EXISTS wa_ai_settings (
  id SERIAL PRIMARY KEY,
  channel_id INTEGER REFERENCES wa_channels(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'openai',
  api_key TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  endpoint TEXT DEFAULT 'https://api.openai.com/v1',
  temperature TEXT DEFAULT '0.7',
  max_tokens TEXT DEFAULT '500',
  is_active BOOLEAN DEFAULT false,
  trigger_words JSONB DEFAULT '[]'::jsonb,
  system_prompt TEXT,
  escalation_rules JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wa_ai_settings_channel_idx ON wa_ai_settings(channel_id);

CREATE TABLE IF NOT EXISTS wa_training_sources (
  id SERIAL PRIMARY KEY,
  channel_id INTEGER REFERENCES wa_channels(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  chunk_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wa_training_sources_channel_idx ON wa_training_sources(channel_id);

CREATE TABLE IF NOT EXISTS wa_training_chunks (
  id SERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL REFERENCES wa_training_sources(id) ON DELETE CASCADE,
  channel_id INTEGER REFERENCES wa_channels(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wa_training_chunks_source_idx ON wa_training_chunks(source_id);
CREATE INDEX IF NOT EXISTS wa_training_chunks_channel_idx ON wa_training_chunks(channel_id);

CREATE TABLE IF NOT EXISTS wa_training_qa_pairs (
  id SERIAL PRIMARY KEY,
  channel_id INTEGER REFERENCES wa_channels(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  embedding JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wa_training_qa_channel_idx ON wa_training_qa_pairs(channel_id);
