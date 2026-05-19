-- Migration: Add flow_data column to wa_automations table
-- This enables storing the visual workflow nodes and edges for automations.

ALTER TABLE wa_automations
  ADD COLUMN IF NOT EXISTS flow_data JSONB DEFAULT '{}';
