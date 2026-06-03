-- Migration: Add whatsapp widgets settings table
-- Creates wa_widgets

CREATE TABLE IF NOT EXISTS wa_widgets (
  id SERIAL PRIMARY KEY,
  clinic_id INTEGER,
  channel_id INTEGER REFERENCES wa_channels(id) ON DELETE CASCADE,
  widget_enabled BOOLEAN DEFAULT true,
  widget_config JSONB DEFAULT '{}'::jsonb,
  ai_training_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
