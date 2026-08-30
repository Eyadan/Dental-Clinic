-- Fix: Allow dentists to create appointments and appointment_services
-- Per UI/UX & Clinical Workstation requirements, dentists can book follow-ups, walk-ins, and appointments
-- Previously appointments_insert and appointment_services_insert only allowed 'reception' and 'admin'

-- Drop existing appointment insert policy
DROP POLICY IF EXISTS appointments_insert ON appointments;

-- Recreate appointments_insert with dentist included
CREATE POLICY appointments_insert ON appointments
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('reception', 'admin', 'dentist'));

-- Drop existing appointment_services insert, update, delete policies
DROP POLICY IF EXISTS appointment_services_insert ON appointment_services;
DROP POLICY IF EXISTS appointment_services_update ON appointment_services;
DROP POLICY IF EXISTS appointment_services_delete ON appointment_services;

-- Recreate appointment_services policies with dentist included
CREATE POLICY appointment_services_insert ON appointment_services
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('reception', 'admin', 'dentist'));

CREATE POLICY appointment_services_update ON appointment_services
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('reception', 'admin', 'dentist'))
  WITH CHECK (get_user_role() IN ('reception', 'admin', 'dentist'));

CREATE POLICY appointment_services_delete ON appointment_services
  FOR DELETE TO authenticated
  USING (get_user_role() IN ('reception', 'admin', 'dentist'));
