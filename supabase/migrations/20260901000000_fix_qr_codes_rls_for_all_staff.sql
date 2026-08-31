-- ============================================================
-- Fix: qr_codes RLS policies must allow all staff roles (admin, reception, dentist)
-- to INSERT and UPDATE. Previously only 'reception' and 'admin' were allowed,
-- causing "new row violates row-level security policy" errors when dentists
-- generate QR codes for patient registration.
-- ============================================================

DROP POLICY IF EXISTS qr_codes_insert ON qr_codes;
DROP POLICY IF EXISTS qr_codes_update ON qr_codes;

CREATE POLICY qr_codes_insert ON qr_codes
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() IN ('admin', 'reception', 'dentist')
  );

CREATE POLICY qr_codes_update ON qr_codes
  FOR UPDATE TO authenticated
  USING (
    get_user_role() IN ('admin', 'reception', 'dentist')
  )
  WITH CHECK (
    get_user_role() IN ('admin', 'reception', 'dentist')
  );
