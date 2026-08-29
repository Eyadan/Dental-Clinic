-- Create Supabase Auth users matching the seed users
-- Run this via Supabase Studio SQL Editor or psql

-- Admin user
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, phone_change_token, reauthentication_token)
SELECT
  'a0000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'admin@clinic.local',
  crypt('AdminPass123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@clinic.local');

-- Reception user
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, phone_change_token, reauthentication_token)
SELECT
  'a0000000-0000-4000-8000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'reception@clinic.local',
  crypt('ReceptionPass123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'reception@clinic.local');

-- Dentist 1
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, phone_change_token, reauthentication_token)
SELECT
  'a0000000-0000-4000-8000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'dentist@clinic.local',
  crypt('DentistPass123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'dentist@clinic.local');

-- Dentist 2
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, phone_change_token, reauthentication_token)
SELECT
  'a0000000-0000-4000-8000-000000000004',
  '00000000-0000-0000-0000-000000000000',
  'dentist2@clinic.local',
  crypt('Dentist2Pass123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'dentist2@clinic.local');
