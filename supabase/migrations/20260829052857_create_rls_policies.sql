-- ============================================================
-- RLS Policies for all 21 tables
-- Per SECURITY §4.3 — Role-based access control at database level
-- Roles: admin, reception, dentist (resolved from public.users.role)
-- ============================================================

-- Helper function: get current user's application role
-- NOTE: auth.jwt() ->> 'role' is the GoTrue default role ('authenticated'),
--       NOT the application role. We must read from public.users.
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

-- Helper function: get current user's dentist_id (if role is dentist)
CREATE OR REPLACE FUNCTION get_current_dentist_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM dentists WHERE user_id = auth.uid();
$$;

-- ============================================================
-- Enable RLS on ALL tables
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE dentists ENABLE ROW LEVEL SECURITY;
ALTER TABLE dentist_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE dentist_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE messenger_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messenger_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reassignment_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USERS
-- ============================================================

CREATE POLICY users_select ON users
  FOR SELECT TO authenticated
  USING (
    id = auth.uid() OR get_user_role() = 'admin'
  );

CREATE POLICY users_insert ON users
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY users_update ON users
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid() OR get_user_role() = 'admin'
  )
  WITH CHECK (
    id = auth.uid() OR get_user_role() = 'admin'
  );

-- No DELETE policy → DELETE is denied

-- ============================================================
-- DENTISTS
-- ============================================================

CREATE POLICY dentists_select ON dentists
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY dentists_insert ON dentists
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY dentists_update ON dentists
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid() OR get_user_role() = 'admin'
  )
  WITH CHECK (
    user_id = auth.uid() OR get_user_role() = 'admin'
  );

-- ============================================================
-- DENTIST_SCHEDULES
-- ============================================================

CREATE POLICY dentist_schedules_select ON dentist_schedules
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY dentist_schedules_insert ON dentist_schedules
  FOR INSERT TO authenticated
  WITH CHECK (
    dentist_id = get_current_dentist_id() OR get_user_role() = 'admin'
  );

CREATE POLICY dentist_schedules_update ON dentist_schedules
  FOR UPDATE TO authenticated
  USING (
    dentist_id = get_current_dentist_id() OR get_user_role() = 'admin'
  )
  WITH CHECK (
    dentist_id = get_current_dentist_id() OR get_user_role() = 'admin'
  );

CREATE POLICY dentist_schedules_delete ON dentist_schedules
  FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

-- ============================================================
-- DENTIST_BLOCKS
-- ============================================================

CREATE POLICY dentist_blocks_select ON dentist_blocks
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY dentist_blocks_insert ON dentist_blocks
  FOR INSERT TO authenticated
  WITH CHECK (
    dentist_id = get_current_dentist_id()
    OR get_user_role() = 'admin'
    OR get_user_role() = 'reception'
  );

CREATE POLICY dentist_blocks_update ON dentist_blocks
  FOR UPDATE TO authenticated
  USING (
    dentist_id = get_current_dentist_id()
    OR get_user_role() = 'admin'
    OR get_user_role() = 'reception'
  )
  WITH CHECK (
    dentist_id = get_current_dentist_id()
    OR get_user_role() = 'admin'
    OR get_user_role() = 'reception'
  );

CREATE POLICY dentist_blocks_delete ON dentist_blocks
  FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

-- ============================================================
-- CLINIC_SETTINGS
-- ============================================================

CREATE POLICY clinic_settings_select ON clinic_settings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY clinic_settings_insert ON clinic_settings
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY clinic_settings_update ON clinic_settings
  FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ============================================================
-- CLINIC_HOLIDAYS
-- ============================================================

CREATE POLICY clinic_holidays_select ON clinic_holidays
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY clinic_holidays_insert ON clinic_holidays
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY clinic_holidays_update ON clinic_holidays
  FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY clinic_holidays_delete ON clinic_holidays
  FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

-- ============================================================
-- PATIENTS
-- ============================================================

CREATE POLICY patients_select ON patients
  FOR SELECT TO authenticated
  USING (
    is_archived = false OR get_user_role() = 'admin'
  );

CREATE POLICY patients_insert ON patients
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() IN ('reception', 'admin')
  );

CREATE POLICY patients_update ON patients
  FOR UPDATE TO authenticated
  USING (
    get_user_role() IN ('reception', 'dentist', 'admin')
  )
  WITH CHECK (
    get_user_role() IN ('reception', 'dentist', 'admin')
  );

-- No DELETE policy → archive instead

-- ============================================================
-- DENTAL_SERVICES
-- ============================================================

CREATE POLICY dental_services_select ON dental_services
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY dental_services_insert ON dental_services
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY dental_services_update ON dental_services
  FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY dental_services_delete ON dental_services
  FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

-- ============================================================
-- APPOINTMENTS
-- ============================================================

CREATE POLICY appointments_select ON appointments
  FOR SELECT TO authenticated
  USING (
    CASE
      WHEN get_user_role() = 'admin' THEN true
      WHEN get_user_role() = 'reception' THEN true
      WHEN get_user_role() = 'dentist' THEN
        dentist_id = get_current_dentist_id()
      ELSE false
    END
  );

CREATE POLICY appointments_insert ON appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() IN ('reception', 'admin')
  );

CREATE POLICY appointments_update ON appointments
  FOR UPDATE TO authenticated
  USING (
    CASE
      WHEN get_user_role() = 'admin' THEN true
      WHEN get_user_role() = 'reception' THEN true
      WHEN get_user_role() = 'dentist' THEN
        dentist_id = get_current_dentist_id()
      ELSE false
    END
  )
  WITH CHECK (
    CASE
      WHEN get_user_role() = 'admin' THEN true
      WHEN get_user_role() = 'reception' THEN true
      WHEN get_user_role() = 'dentist' THEN
        dentist_id = get_current_dentist_id()
      ELSE false
    END
  );

-- No DELETE policy → archive instead

-- ============================================================
-- APPOINTMENT_SERVICES
-- ============================================================

CREATE POLICY appointment_services_select ON appointment_services
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY appointment_services_insert ON appointment_services
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() IN ('reception', 'admin')
  );

CREATE POLICY appointment_services_update ON appointment_services
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('reception', 'admin'))
  WITH CHECK (get_user_role() IN ('reception', 'admin'));

CREATE POLICY appointment_services_delete ON appointment_services
  FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

-- ============================================================
-- APPOINTMENT_HISTORY (INSERT only — via trigger)
-- ============================================================

CREATE POLICY appointment_history_select ON appointment_history
  FOR SELECT TO authenticated
  USING (true);

-- INSERT only via service role (trigger) — no user INSERT policy
-- No UPDATE, no DELETE policies → denied

-- ============================================================
-- QR_CODES
-- ============================================================

CREATE POLICY qr_codes_select ON qr_codes
  FOR SELECT TO authenticated
  USING (
    get_user_role() IN ('admin', 'reception', 'dentist')
  );

CREATE POLICY qr_codes_insert ON qr_codes
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() IN ('reception', 'admin')
  );

CREATE POLICY qr_codes_update ON qr_codes
  FOR UPDATE TO authenticated
  USING (
    get_user_role() IN ('reception', 'admin')
  )
  WITH CHECK (
    get_user_role() IN ('reception', 'admin')
  );

-- No DELETE policy

-- ============================================================
-- CONSENT_FORMS (INSERT only — immutable after creation)
-- ============================================================

CREATE POLICY consent_forms_select ON consent_forms
  FOR SELECT TO authenticated
  USING (
    CASE
      WHEN get_user_role() = 'admin' THEN true
      WHEN get_user_role() = 'dentist' THEN
        appointment_id IN (
          SELECT id FROM appointments
          WHERE dentist_id = get_current_dentist_id()
        )
      ELSE false
    END
  );

CREATE POLICY consent_forms_insert ON consent_forms
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() IN ('dentist', 'reception')
  );

-- No UPDATE, no DELETE → immutable

-- ============================================================
-- TREATMENT_RECORDS
-- ============================================================

CREATE POLICY treatment_records_select ON treatment_records
  FOR SELECT TO authenticated
  USING (
    CASE
      WHEN get_user_role() = 'admin' THEN true
      WHEN get_user_role() = 'dentist' THEN
        appointment_id IN (
          SELECT id FROM appointments
          WHERE dentist_id = get_current_dentist_id()
        )
      ELSE false
    END
  );

CREATE POLICY treatment_records_insert ON treatment_records
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'dentist');

CREATE POLICY treatment_records_update ON treatment_records
  FOR UPDATE TO authenticated
  USING (
    CASE
      WHEN get_user_role() = 'admin' THEN true
      WHEN get_user_role() = 'dentist' THEN
        appointment_id IN (
          SELECT id FROM appointments
          WHERE dentist_id = get_current_dentist_id()
        )
      ELSE false
    END
  )
  WITH CHECK (
    CASE
      WHEN get_user_role() = 'admin' THEN true
      WHEN get_user_role() = 'dentist' THEN
        appointment_id IN (
          SELECT id FROM appointments
          WHERE dentist_id = get_current_dentist_id()
        )
      ELSE false
    END
  );

-- No DELETE policy

-- ============================================================
-- INVOICES
-- ============================================================

CREATE POLICY invoices_select ON invoices
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY invoices_insert ON invoices
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('reception', 'admin'));

CREATE POLICY invoices_update ON invoices
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('reception', 'admin'))
  WITH CHECK (get_user_role() IN ('reception', 'admin'));

-- No DELETE policy

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE POLICY payments_select ON payments
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY payments_insert ON payments
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('reception', 'admin'));

CREATE POLICY payments_update ON payments
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('reception', 'admin'))
  WITH CHECK (get_user_role() IN ('reception', 'admin'));

-- No DELETE policy

-- ============================================================
-- WAITLIST_ENTRIES
-- ============================================================

CREATE POLICY waitlist_entries_select ON waitlist_entries
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('reception', 'admin'));

CREATE POLICY waitlist_entries_insert ON waitlist_entries
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('reception', 'admin'));

CREATE POLICY waitlist_entries_update ON waitlist_entries
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('reception', 'admin'))
  WITH CHECK (get_user_role() IN ('reception', 'admin'));

CREATE POLICY waitlist_entries_delete ON waitlist_entries
  FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

-- ============================================================
-- AUDIT_LOGS (Admin read only, service role INSERT only)
-- ============================================================

CREATE POLICY audit_logs_select ON audit_logs
  FOR SELECT TO authenticated
  USING (get_user_role() = 'admin');

-- No user INSERT/UPDATE/DELETE policies
-- INSERT via service role (triggers), UPDATE/DELETE denied by triggers

-- ============================================================
-- MESSENGER_CONVERSATIONS
-- ============================================================

CREATE POLICY messenger_conversations_select ON messenger_conversations
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('reception', 'admin'));

CREATE POLICY messenger_conversations_insert ON messenger_conversations
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('reception', 'admin'));

CREATE POLICY messenger_conversations_update ON messenger_conversations
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('reception', 'admin'))
  WITH CHECK (get_user_role() IN ('reception', 'admin'));

-- No DELETE policy

-- ============================================================
-- MESSENGER_MESSAGES (INSERT only — immutable)
-- ============================================================

CREATE POLICY messenger_messages_select ON messenger_messages
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('reception', 'admin'));

CREATE POLICY messenger_messages_insert ON messenger_messages
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('reception', 'admin'));

-- No UPDATE, no DELETE → immutable

-- ============================================================
-- REASSIGNMENT_LOGS (INSERT only — immutable)
-- ============================================================

CREATE POLICY reassignment_logs_select ON reassignment_logs
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY reassignment_logs_insert ON reassignment_logs
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('reception', 'admin'));

-- No UPDATE, no DELETE → immutable
