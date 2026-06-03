-- Fix: Add ON DELETE SET NULL to wa_campaigns.template_id foreign key
-- This prevents FK constraint errors when deleting templates that are referenced by campaigns.

ALTER TABLE "wa_campaigns" DROP CONSTRAINT IF EXISTS "wa_campaigns_template_id_wa_templates_id_fk";
ALTER TABLE "wa_campaigns" ADD CONSTRAINT "wa_campaigns_template_id_wa_templates_id_fk"
  FOREIGN KEY ("template_id") REFERENCES "wa_templates"("id") ON DELETE SET NULL;
