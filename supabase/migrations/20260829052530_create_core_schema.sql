-- ============================================================
-- Core Schema: Enums + Staff/Dentist/Clinic/Patient tables
-- 3NF-compliant, snake_case, UUID primary keys
-- ============================================================

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'reception', 'dentist');

CREATE TYPE booking_status AS ENUM (
  'pending',
  'approved',
  'confirmed',
  'completed',
  'declined',
  'expired',
  'reschedule_required',
  'rescheduled',
  'pending_cancellation',
  'cancelled',
  'no_show'
);

CREATE TYPE visit_status AS ENUM (
  'checked_in',
  'waiting',
  'in_consultation',
  'consent_signed',
  'treatment_ongoing',
  'checkout',
  'completed',
  'delayed',
  'treatment_paused',
  'awaiting_requirement',
  'resumed'
);

CREATE TYPE payment_status AS ENUM (
  'pending_payment',
  'partially_paid',
  'paid',
  'payment_failed',
  'refunded'
);

CREATE TYPE payment_method AS ENUM ('cash', 'gcash', 'maya', 'card', 'bank_transfer');

CREATE TYPE block_type AS ENUM ('vacation', 'break', 'sick_leave', 'other');

CREATE TYPE recurrence_rule AS ENUM ('none', 'daily', 'weekly', 'monthly');

CREATE TYPE conversation_status AS ENUM ('active', 'taken_over', 'ended', 'bot_handled');

CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');

-- ============================================================
-- USERS TABLE (Staff accounts — Supabase Auth compatible)
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- DENTISTS TABLE
-- ============================================================

CREATE TABLE dentists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  license_no TEXT NOT NULL UNIQUE,
  specialization TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- DENTIST_SCHEDULES TABLE
-- ============================================================

CREATE TABLE dentist_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id UUID NOT NULL REFERENCES dentists(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_schedule_time_order CHECK (start_time < end_time)
);

-- ============================================================
-- DENTIST_BLOCKS TABLE
-- ============================================================

CREATE TABLE dentist_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id UUID NOT NULL REFERENCES dentists(id) ON DELETE CASCADE,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  block_type block_type NOT NULL DEFAULT 'other',
  recurrence_rule recurrence_rule NOT NULL DEFAULT 'none',
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_block_time_order CHECK (start_datetime < end_datetime)
);

-- ============================================================
-- CLINIC_SETTINGS TABLE
-- ============================================================

CREATE TABLE clinic_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  category TEXT NOT NULL,
  data_type TEXT NOT NULL DEFAULT 'string',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CLINIC_HOLIDAYS TABLE
-- ============================================================

CREATE TABLE clinic_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  description TEXT,
  is_half_day BOOLEAN NOT NULL DEFAULT false,
  operating_hours JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PATIENTS TABLE
-- ============================================================

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  contact_no TEXT NOT NULL,
  email TEXT,
  birth_date DATE,
  medical_history TEXT,
  allergies TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- DENTAL_SERVICES TABLE
-- ============================================================

CREATE TABLE dental_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  default_duration_minutes INTEGER NOT NULL CHECK (default_duration_minutes > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- APPOINTMENTS TABLE (Triple status model)
-- ============================================================

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  dentist_id UUID NOT NULL REFERENCES dentists(id) ON DELETE RESTRICT,
  booking_status booking_status NOT NULL DEFAULT 'pending',
  visit_status visit_status,
  payment_status payment_status NOT NULL DEFAULT 'pending_payment',
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  total_duration INTEGER NOT NULL CHECK (total_duration > 0),
  reference_no TEXT NOT NULL UNIQUE,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- APPOINTMENT_SERVICES TABLE (M:N junction)
-- ============================================================

CREATE TABLE appointment_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES dental_services(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_appointment_service UNIQUE (appointment_id, service_id)
);

-- ============================================================
-- APPOINTMENT_HISTORY TABLE (Audit trail)
-- ============================================================

CREATE TABLE appointment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- QR_CODES TABLE
-- ============================================================

CREATE TABLE qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  is_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CONSENT_FORMS TABLE
-- ============================================================

CREATE TABLE consent_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  treatment_info TEXT NOT NULL,
  consent_version TEXT NOT NULL DEFAULT '1.0',
  signature_image_url TEXT,
  signed_at TIMESTAMPTZ,
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TREATMENT_RECORDS TABLE (1:1 with appointments)
-- ============================================================

CREATE TABLE treatment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  diagnosis TEXT,
  procedures TEXT,
  clinical_notes TEXT,
  prescriptions TEXT,
  treatment_plan TEXT,
  pause_reason TEXT,
  paused_at TIMESTAMPTZ,
  resumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INVOICES TABLE
-- ============================================================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  payment_status payment_status NOT NULL DEFAULT 'pending_payment',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PAYMENTS TABLE
-- ============================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  method payment_method NOT NULL,
  proof_image_url TEXT,
  recorded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- WAITLIST_ENTRIES TABLE
-- ============================================================

CREATE TABLE waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  requested_date DATE NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AUDIT_LOGS TABLE (IMMUTABLE — INSERT only)
-- ============================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent UPDATE and DELETE on audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is immutable — modification not allowed' USING ERRCODE = 'raise_exception';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_audit_log_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

CREATE TRIGGER prevent_audit_log_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

-- ============================================================
-- MESSENGER_CONVERSATIONS TABLE
-- ============================================================

CREATE TABLE messenger_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_psid TEXT NOT NULL,
  status conversation_status NOT NULL DEFAULT 'active',
  taken_over_by UUID REFERENCES users(id) ON DELETE SET NULL,
  taken_over_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MESSENGER_MESSAGES TABLE
-- ============================================================

CREATE TABLE messenger_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES messenger_conversations(id) ON DELETE CASCADE,
  direction message_direction NOT NULL,
  content TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- REASSIGNMENT_LOGS TABLE
-- ============================================================

CREATE TABLE reassignment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  original_dentist_id UUID NOT NULL REFERENCES dentists(id) ON DELETE RESTRICT,
  new_dentist_id UUID NOT NULL REFERENCES dentists(id) ON DELETE RESTRICT,
  original_schedule TEXT NOT NULL,
  new_schedule TEXT NOT NULL,
  reason TEXT NOT NULL,
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Patient search
CREATE INDEX idx_patients_name ON patients (last_name, first_name);
CREATE INDEX idx_patients_contact ON patients (contact_no);
CREATE INDEX idx_patients_email ON patients (email);

-- Appointment queries
CREATE INDEX idx_appointments_date_dentist ON appointments (scheduled_date, dentist_id);
CREATE INDEX idx_appointments_booking_status ON appointments (booking_status);
CREATE INDEX idx_appointments_visit_status ON appointments (visit_status);
CREATE INDEX idx_appointments_payment_status ON appointments (payment_status);
CREATE INDEX idx_appointments_reference ON appointments (reference_no);

-- QR code validation
CREATE INDEX idx_qr_codes_token ON qr_codes (token);

-- Audit log queries
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs (user_id, timestamp);

-- Messenger conversations
CREATE INDEX idx_messenger_conversations_psid ON messenger_conversations (patient_psid);
CREATE INDEX idx_messenger_conversations_status ON messenger_conversations (status);

-- Waitlist (FIFO ordering)
CREATE INDEX idx_waitlist_date_joined ON waitlist_entries (requested_date, joined_at);

-- Dentist schedule lookups
CREATE INDEX idx_dentist_schedules_dentist ON dentist_schedules (dentist_id, day_of_week);
CREATE INDEX idx_dentist_blocks_dentist ON dentist_blocks (dentist_id, start_datetime);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables with updated_at
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_dentists_updated_at BEFORE UPDATE ON dentists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_dentist_schedules_updated_at BEFORE UPDATE ON dentist_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_dentist_blocks_updated_at BEFORE UPDATE ON dentist_blocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_clinic_settings_updated_at BEFORE UPDATE ON clinic_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_clinic_holidays_updated_at BEFORE UPDATE ON clinic_holidays FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_dental_services_updated_at BEFORE UPDATE ON dental_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_consent_forms_updated_at BEFORE UPDATE ON consent_forms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_treatment_records_updated_at BEFORE UPDATE ON treatment_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_waitlist_entries_updated_at BEFORE UPDATE ON waitlist_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_messenger_conversations_updated_at BEFORE UPDATE ON messenger_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
