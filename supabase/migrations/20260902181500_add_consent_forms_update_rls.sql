-- Fix: Add UPDATE RLS policy on consent_forms
-- The consent_forms table was INSERT-only (immutable after creation).
-- The signConsentAction needs to UPDATE signed_at and signature_image_url
-- when the patient signs the consent form. Without an UPDATE policy,
-- RLS silently blocks the update (0 rows affected, no error returned),
-- causing the "Thank you, your consent has been recorded" success message
-- to show while the database remains unsigned.

CREATE POLICY consent_forms_update ON consent_forms
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));
