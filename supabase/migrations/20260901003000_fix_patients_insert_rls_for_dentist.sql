-- Fix: Allow dentists as well as reception and admin to insert new patient records
DROP POLICY IF EXISTS patients_insert ON patients;

CREATE POLICY patients_insert ON patients
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() IN ('reception', 'dentist', 'admin')
  );
