-- ============================================================
-- POST-SCHEMA SETUP — Run AFTER schema.sql AND after creating
-- the 4 auth users in Supabase Dashboard (Authentication → Users).
--
-- This script:
--   1. Links auth.users → public.users (with roles)
--   2. Creates dentist records + schedules
--   3. Inserts clinic settings + holidays
--   4. Inserts dental services catalog
--
-- It does NOT create test patients (dev-only data).
-- ============================================================

-- ============================================================
-- 1. PUBLIC.USERS — linked to auth.users by email
-- ============================================================
INSERT INTO users (id, email, role, first_name, last_name)
SELECT id, email, 'admin'::user_role, 'Admin', 'User'
FROM auth.users WHERE email = 'admin@clinic.local'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, email, role, first_name, last_name)
SELECT id, email, 'reception'::user_role, 'Reception', 'Staff'
FROM auth.users WHERE email = 'reception@clinic.local'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, email, role, first_name, last_name)
SELECT id, email, 'dentist'::user_role, 'John', 'Doe'
FROM auth.users WHERE email = 'dentist@clinic.local'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, email, role, first_name, last_name)
SELECT id, email, 'dentist'::user_role, 'Jane', 'Smith'
FROM auth.users WHERE email = 'dentist2@clinic.local'
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 2. DENTISTS — linked to public.users by email
-- ============================================================
INSERT INTO dentists (user_id, license_no, specialization)
SELECT u.id, 'PRC-D-12345', 'General Dentistry'
FROM users u WHERE u.email = 'dentist@clinic.local'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO dentists (user_id, license_no, specialization)
SELECT u.id, 'PRC-D-67890', 'Orthodontics'
FROM users u WHERE u.email = 'dentist2@clinic.local'
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- 3. DENTIST_SCHEDULES
-- ============================================================
INSERT INTO dentist_schedules (dentist_id, day_of_week, start_time, end_time)
SELECT d.id, 0, '09:00', '17:00' FROM dentists d
JOIN users u ON d.user_id = u.id WHERE u.email = 'dentist@clinic.local'
ON CONFLICT DO NOTHING;

INSERT INTO dentist_schedules (dentist_id, day_of_week, start_time, end_time)
SELECT d.id, 1, '09:00', '17:00' FROM dentists d
JOIN users u ON d.user_id = u.id WHERE u.email = 'dentist@clinic.local'
ON CONFLICT DO NOTHING;

INSERT INTO dentist_schedules (dentist_id, day_of_week, start_time, end_time)
SELECT d.id, 2, '09:00', '17:00' FROM dentists d
JOIN users u ON d.user_id = u.id WHERE u.email = 'dentist@clinic.local'
ON CONFLICT DO NOTHING;

INSERT INTO dentist_schedules (dentist_id, day_of_week, start_time, end_time)
SELECT d.id, 3, '09:00', '17:00' FROM dentists d
JOIN users u ON d.user_id = u.id WHERE u.email = 'dentist@clinic.local'
ON CONFLICT DO NOTHING;

INSERT INTO dentist_schedules (dentist_id, day_of_week, start_time, end_time)
SELECT d.id, 4, '09:00', '17:00' FROM dentists d
JOIN users u ON d.user_id = u.id WHERE u.email = 'dentist@clinic.local'
ON CONFLICT DO NOTHING;

INSERT INTO dentist_schedules (dentist_id, day_of_week, start_time, end_time)
SELECT d.id, 5, '09:00', '12:00' FROM dentists d
JOIN users u ON d.user_id = u.id WHERE u.email = 'dentist@clinic.local'
ON CONFLICT DO NOTHING;

INSERT INTO dentist_schedules (dentist_id, day_of_week, start_time, end_time)
SELECT d.id, 0, '10:00', '18:00' FROM dentists d
JOIN users u ON d.user_id = u.id WHERE u.email = 'dentist2@clinic.local'
ON CONFLICT DO NOTHING;

INSERT INTO dentist_schedules (dentist_id, day_of_week, start_time, end_time)
SELECT d.id, 2, '10:00', '18:00' FROM dentists d
JOIN users u ON d.user_id = u.id WHERE u.email = 'dentist2@clinic.local'
ON CONFLICT DO NOTHING;

INSERT INTO dentist_schedules (dentist_id, day_of_week, start_time, end_time)
SELECT d.id, 4, '10:00', '18:00' FROM dentists d
JOIN users u ON d.user_id = u.id WHERE u.email = 'dentist2@clinic.local'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. CLINIC_SETTINGS
-- ============================================================
INSERT INTO clinic_settings (setting_key, setting_value, category, data_type) VALUES
  ('clinic_name', 'Smile Dental Clinic', 'general', 'string'),
  ('clinic_address', '123 Main St, Quezon City, Metro Manila', 'general', 'string'),
  ('clinic_phone', '+63-2-8888-1234', 'general', 'string'),
  ('clinic_email', 'info@smiledental.ph', 'general', 'string'),
  ('operating_hours_start', '09:00', 'schedule', 'string'),
  ('operating_hours_end', '17:00', 'schedule', 'string'),
  ('slot_interval_minutes', '30', 'schedule', 'integer'),
  ('booking_approval_expiration_hours', '24', 'booking', 'integer'),
  ('confirmation_reminder_enabled', 'true', 'notifications', 'boolean'),
  ('password_min_length', '12', 'security', 'integer'),
  ('password_require_uppercase', 'true', 'security', 'boolean'),
  ('password_require_lowercase', 'true', 'security', 'boolean'),
  ('password_require_numbers', 'true', 'security', 'boolean'),
  ('password_require_special', 'true', 'security', 'boolean'),
  ('password_expiration_days', '90', 'security', 'integer'),
  ('max_failed_attempts', '5', 'security', 'integer'),
  ('lockout_duration_minutes', '15', 'security', 'integer'),
  ('session_timeout_minutes', '30', 'security', 'integer')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================
-- 5. CLINIC_HOLIDAYS
-- ============================================================
INSERT INTO clinic_holidays (date, description, is_half_day, operating_hours) VALUES
  ('2026-01-01', 'New Year''s Day', false, NULL),
  ('2026-12-25', 'Christmas Day', false, NULL),
  ('2026-12-30', 'Rizal Day', false, NULL),
  ('2026-11-30', 'Bonifacio Day', false, NULL),
  ('2026-06-12', 'Independence Day', false, NULL)
ON CONFLICT (date) DO NOTHING;

-- ============================================================
-- 6. DENTAL_SERVICES
-- ============================================================
INSERT INTO dental_services (name, description, default_duration_minutes) VALUES
  ('Dental Checkup', 'Routine oral examination and cleaning', 30),
  ('Tooth Extraction', 'Simple or surgical tooth removal', 45),
  ('Dental Filling', 'Cavity restoration with composite or amalgam', 60),
  ('Root Canal Therapy', 'Endodontic treatment for infected pulp', 90),
  ('Teeth Whitening', 'Professional bleaching procedure', 60),
  ('Orthodontic Adjustment', 'Braces tightening and adjustment', 30),
  ('Dental X-Ray', 'Intraoral or panoramic X-ray imaging', 15),
  ('Dental Crown Fitting', 'Crown preparation and fitting', 90),
  ('Denture Fitting', 'Partial or complete denture fitting', 120),
  ('Fluoride Treatment', 'Topical fluoride application', 15)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- DONE — verify with:
--   SELECT email, role FROM users ORDER BY role;
--   SELECT license_no, specialization FROM dentists;
--   SELECT name FROM dental_services;
-- ============================================================
