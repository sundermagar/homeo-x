-- ============================================================
-- Migration 0012: Add admin fields to organizations table
-- Drops legacy profile columns and adds admin_email/password.
-- ============================================================

-- Remove legacy columns that were causing NOT NULL violations
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "profile_image";
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "profile";

-- Add required admin fields
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "admin_email" text DEFAULT '';
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "admin_password" text DEFAULT '';
