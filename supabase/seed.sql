-- ============================================================
-- Seed Data for Local Development
-- Run automatically by `npx supabase db reset`
-- Uses fixed UUIDs for referential integrity
-- ============================================================

-- ============================================================
-- USERS (Staff accounts — 3 roles)
-- NOTE: In production, these are created via Supabase Auth.
-- For local dev, we insert directly. Passwords are placeholders.
-- ============================================================

INSERT INTO users (id, email, role, first_name, last_name) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'admin@clinic.local', 'admin', 'Admin', 'User'),
  ('a0000000-0000-4000-8000-000000000002', 'reception@clinic.local', 'reception', 'Reception', 'Staff'),
  ('a0000000-0000-4000-8000-000000000003', 'dentist@clinic.local', 'dentist', 'John', 'Doe'),
  ('a0000000-0000-4000-8000-000000000004', 'dentist2@clinic.local', 'dentist', 'Jane', 'Smith');

-- ============================================================
-- DENTISTS
-- ============================================================

INSERT INTO dentists (id, user_id, license_no, specialization) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'PRC-D-12345', 'General Dentistry'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000004', 'PRC-D-67890', 'Orthodontics');

-- ============================================================
-- DENTIST_SCHEDULES (Mon-Fri 9-17, Sat 9-12 for dentist 1)
-- ============================================================

INSERT INTO dentist_schedules (dentist_id, day_of_week, start_time, end_time) VALUES
  ('b0000000-0000-4000-8000-000000000001', 0, '09:00', '17:00'),
  ('b0000000-0000-4000-8000-000000000001', 1, '09:00', '17:00'),
  ('b0000000-0000-4000-8000-000000000001', 2, '09:00', '17:00'),
  ('b0000000-0000-4000-8000-000000000001', 3, '09:00', '17:00'),
  ('b0000000-0000-4000-8000-000000000001', 4, '09:00', '17:00'),
  ('b0000000-0000-4000-8000-000000000001', 5, '09:00', '12:00'),
  ('b0000000-0000-4000-8000-000000000002', 0, '10:00', '18:00'),
  ('b0000000-0000-4000-8000-000000000002', 2, '10:00', '18:00'),
  ('b0000000-0000-4000-8000-000000000002', 4, '10:00', '18:00');

-- ============================================================
-- CLINIC_SETTINGS
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
  ('session_timeout_minutes', '30', 'security', 'integer');

-- ============================================================
-- CLINIC_HOLIDAYS
-- ============================================================

INSERT INTO clinic_holidays (date, description, is_half_day, operating_hours) VALUES
  ('2026-01-01', 'New Year''s Day', false, NULL),
  ('2026-12-25', 'Christmas Day', false, NULL),
  ('2026-12-30', 'Rizal Day', false, NULL),
  ('2026-11-30', 'Bonifacio Day', false, NULL),
  ('2026-06-12', 'Independence Day', false, NULL);

-- ============================================================
-- DENTAL_SERVICES
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
  ('Fluoride Treatment', 'Topical fluoride application', 15);

-- ============================================================
-- PATIENTS
-- ============================================================

INSERT INTO patients (first_name, last_name, contact_no, email, birth_date, medical_history, allergies) VALUES
  ('Juan', 'Dela Cruz', '+63-917-123-4567', 'juan.delacruz@email.com', '1990-05-15', 'No significant medical history', 'Penicillin'),
  ('Maria', 'Santos', '+63-918-234-5678', 'maria.santos@email.com', '1985-08-22', 'Hypertension, controlled with medication', 'None'),
  ('Pedro', 'Reyes', '+63-919-345-6789', 'pedro.reyes@email.com', '1995-03-10', 'Asthma', 'Latex'),
  ('Ana', 'Lim', '+63-920-456-7890', 'ana.lim@email.com', '2000-11-30', 'No significant medical history', 'None'),
  ('Carlos', 'Garcia', '+63-921-567-8901', 'carlos.garcia@email.com', '1978-07-04', 'Diabetes Type 2', 'None'),
  ('Liza', 'Mendoza', '+63-922-678-9012', 'liza.mendoza@email.com', '1992-12-18', 'No significant medical history', 'Sulfa drugs'),
  ('Roberto', 'Tan', '+63-923-789-0123', 'roberto.tan@email.com', '1965-04-25', 'Hypertension, arthritis', 'Aspirin'),
  ('Cynthia', 'Villanueva', '+63-924-890-1234', 'cynthia.v@email.com', '1988-09-14', 'No significant medical history', 'None');
