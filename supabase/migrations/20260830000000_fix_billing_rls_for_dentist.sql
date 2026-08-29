-- Fix: Allow dentists to generate invoices and record payments
-- Per UI/UX §6.1, dentists have billing access (view + generate)
-- Previously only reception/admin could insert invoices and payments

-- Drop existing invoice policies
DROP POLICY IF EXISTS invoices_insert ON invoices;
DROP POLICY IF EXISTS invoices_update ON invoices;

-- Recreate with dentist included
CREATE POLICY invoices_insert ON invoices
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('reception', 'admin', 'dentist'));

CREATE POLICY invoices_update ON invoices
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('reception', 'admin', 'dentist'))
  WITH CHECK (get_user_role() IN ('reception', 'admin', 'dentist'));

-- Drop and recreate payments insert policy
DROP POLICY IF EXISTS payments_insert ON payments;

CREATE POLICY payments_insert ON payments
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('reception', 'admin', 'dentist'));

-- Drop and recreate payments update policy
DROP POLICY IF EXISTS payments_update ON payments;

CREATE POLICY payments_update ON payments
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('reception', 'admin', 'dentist'))
  WITH CHECK (get_user_role() IN ('reception', 'admin', 'dentist'));
