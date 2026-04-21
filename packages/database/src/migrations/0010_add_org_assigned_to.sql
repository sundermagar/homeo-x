-- ============================================================
-- Migration 0010: Add assigned_to to organizations table
-- Column is defined in Drizzle schema but missing from DB.
-- Fixes 500 error on POST /api/organizations
-- ============================================================
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "assigned_to" integer DEFAULT 1;
