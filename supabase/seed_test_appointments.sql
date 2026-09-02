-- ============================================================
-- Test Data: Appointments for Today
-- Run via: npx supabase db query --local < supabase/seed_test_appointments.sql
-- Or paste into Supabase Studio SQL Editor (http://localhost:54323)
--
-- Creates 6 appointments covering different statuses:
--   1. Pending booking (awaiting approval)
--   2. Approved (ready for check-in)
--   3. Approved + Checked-in (in queue)
--   4. Confirmed + In consultation
--   5. Completed (finished, pending payment)
--   6. Declined (rejected booking)
-- ============================================================

-- Fix service prices (seed.sql runs after migration, overwriting prices to 0)
UPDATE dental_services SET default_price = 500 WHERE name = 'Dental Checkup';
UPDATE dental_services SET default_price = 1500 WHERE name = 'Teeth Whitening';
UPDATE dental_services SET default_price = 800 WHERE name = 'Dental X-Ray';
UPDATE dental_services SET default_price = 2500 WHERE name = 'Tooth Extraction';
UPDATE dental_services SET default_price = 3500 WHERE name = 'Dental Filling';
UPDATE dental_services SET default_price = 12000 WHERE name = 'Root Canal Therapy';
UPDATE dental_services SET default_price = 15000 WHERE name = 'Dental Crown Fitting';
UPDATE dental_services SET default_price = 25000 WHERE name = 'Denture Fitting';
UPDATE dental_services SET default_price = 800 WHERE name = 'Fluoride Treatment';
UPDATE dental_services SET default_price = 2000 WHERE name = 'Orthodontic Adjustment';

-- Get today's date in local timezone (UTC+8)
-- CURRENT_DATE gives the database server date which is UTC
-- We add 8 hours to get PHT date
DO $$
  DECLARE
    today_date DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE;
    dentist1 UUID := 'b0000000-0000-4000-8000-000000000001';
    dentist2 UUID := 'b0000000-0000-4000-8000-000000000002';
    patient_juan UUID;
    patient_maria UUID;
    patient_pedro UUID;
    patient_ana UUID;
    patient_carlos UUID;
    patient_liza UUID;
    svc_checkup UUID;
    svc_extraction UUID;
    svc_filling UUID;
    svc_xray UUID;
    svc_whitening UUID;
    appt1 UUID;
    appt2 UUID;
    appt3 UUID;
    appt4 UUID;
    appt5 UUID;
    appt6 UUID;
  BEGIN
    -- Fetch patient IDs
    SELECT id INTO patient_juan FROM patients WHERE first_name = 'Juan' AND last_name = 'Dela Cruz' LIMIT 1;
    SELECT id INTO patient_maria FROM patients WHERE first_name = 'Maria' AND last_name = 'Santos' LIMIT 1;
    SELECT id INTO patient_pedro FROM patients WHERE first_name = 'Pedro' AND last_name = 'Reyes' LIMIT 1;
    SELECT id INTO patient_ana FROM patients WHERE first_name = 'Ana' AND last_name = 'Lim' LIMIT 1;
    SELECT id INTO patient_carlos FROM patients WHERE first_name = 'Carlos' AND last_name = 'Garcia' LIMIT 1;
    SELECT id INTO patient_liza FROM patients WHERE first_name = 'Liza' AND last_name = 'Mendoza' LIMIT 1;

    -- Fetch service IDs
    SELECT id INTO svc_checkup FROM dental_services WHERE name = 'Dental Checkup' LIMIT 1;
    SELECT id INTO svc_extraction FROM dental_services WHERE name = 'Tooth Extraction' LIMIT 1;
    SELECT id INTO svc_filling FROM dental_services WHERE name = 'Dental Filling' LIMIT 1;
    SELECT id INTO svc_xray FROM dental_services WHERE name = 'Dental X-Ray' LIMIT 1;
    SELECT id INTO svc_whitening FROM dental_services WHERE name = 'Teeth Whitening' LIMIT 1;

    -- ============================================================
    -- 1. PENDING booking — Juan Dela Cruz, Dentist 1, 09:00 today
    --    (Awaiting approval from reception/admin)
    -- ============================================================
    INSERT INTO appointments (id, patient_id, dentist_id, booking_status, scheduled_date, scheduled_time, total_duration, reference_no)
    VALUES (
      gen_random_uuid(),
      patient_juan,
      dentist1,
      'pending',
      today_date,
      '09:00',
      30,
      'TEST-001'
    ) RETURNING id INTO appt1;

    INSERT INTO appointment_services (appointment_id, service_id, price)
    VALUES (appt1, svc_checkup, 500);

    -- ============================================================
    -- 2. APPROVED — Maria Santos, Dentist 1, 10:00 today
    --    (Ready for patient check-in)
    -- ============================================================
    INSERT INTO appointments (id, patient_id, dentist_id, booking_status, scheduled_date, scheduled_time, total_duration, reference_no)
    VALUES (
      gen_random_uuid(),
      patient_maria,
      dentist1,
      'approved',
      today_date,
      '10:00',
      45,
      'TEST-002'
    ) RETURNING id INTO appt2;

    INSERT INTO appointment_services (appointment_id, service_id, price)
    VALUES (appt2, svc_extraction, 2500);

    -- ============================================================
    -- 3. APPROVED + CHECKED-IN — Pedro Reyes, Dentist 2, 10:30 today
    --    (Patient arrived, in queue waiting)
    -- ============================================================
    INSERT INTO appointments (id, patient_id, dentist_id, booking_status, visit_status, scheduled_date, scheduled_time, total_duration, reference_no)
    VALUES (
      gen_random_uuid(),
      patient_pedro,
      dentist2,
      'approved',
      'checked_in',
      today_date,
      '10:30',
      60,
      'TEST-003'
    ) RETURNING id INTO appt3;

    INSERT INTO appointment_services (appointment_id, service_id, price)
    VALUES (appt3, svc_filling, 3500);

    -- ============================================================
    -- 4. CONFIRMED + IN CONSULTATION — Ana Lim, Dentist 1, 11:00 today
    --    (Patient is with the dentist now)
    -- ============================================================
    INSERT INTO appointments (id, patient_id, dentist_id, booking_status, visit_status, scheduled_date, scheduled_time, total_duration, reference_no)
    VALUES (
      gen_random_uuid(),
      patient_ana,
      dentist1,
      'confirmed',
      'in_consultation',
      today_date,
      '11:00',
      15,
      'TEST-004'
    ) RETURNING id INTO appt4;

    INSERT INTO appointment_services (appointment_id, service_id, price)
    VALUES (appt4, svc_xray, 800);

    -- ============================================================
    -- 5. COMPLETED — Carlos Garcia, Dentist 2, 08:00 today
    --    (Finished appointment, pending payment)
    -- ============================================================
    INSERT INTO appointments (id, patient_id, dentist_id, booking_status, visit_status, payment_status, scheduled_date, scheduled_time, total_duration, reference_no)
    VALUES (
      gen_random_uuid(),
      patient_carlos,
      dentist2,
      'completed',
      'completed',
      'pending_payment',
      today_date,
      '08:00',
      60,
      'TEST-005'
    ) RETURNING id INTO appt5;

    INSERT INTO appointment_services (appointment_id, service_id, price)
    VALUES (appt5, svc_whitening, 1500);

    -- Create invoice for completed appointment
    INSERT INTO invoices (appointment_id, total_amount)
    VALUES (appt5, 1500);

    -- ============================================================
    -- 6. DECLINED — Liza Mendoza, Dentist 1, 14:00 today
    --    (Booking was rejected)
    -- ============================================================
    INSERT INTO appointments (id, patient_id, dentist_id, booking_status, scheduled_date, scheduled_time, total_duration, reference_no)
    VALUES (
      gen_random_uuid(),
      patient_liza,
      dentist1,
      'declined',
      today_date,
      '14:00',
      30,
      'TEST-006'
    ) RETURNING id INTO appt6;

    INSERT INTO appointment_services (appointment_id, service_id, price)
    VALUES (appt6, svc_checkup, 500);

    RAISE NOTICE 'Test data inserted successfully for date: %', today_date;
    RAISE NOTICE '6 appointments created with reference numbers TEST-001 through TEST-006';
  END
$$;
