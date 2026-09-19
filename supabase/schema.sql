-- ============================================================
-- DENTAL CLINIC MANAGEMENT SYSTEM — COMPLETE DATABASE SCHEMA
-- ============================================================
-- Consolidated from 30 migration files into a single script.
-- Creates the entire schema from scratch: enums, tables, indexes,
-- triggers, RLS policies, and lookup data.
--
-- IDEMPOTENT: safe to re-run. Uses IF NOT EXISTS / DO blocks /
-- DROP IF EXISTS so it won't fail on already-existing objects.
--
-- Usage:
--   psql -f schema.sql     (against a fresh Supabase/Postgres DB)
--   or paste into Supabase SQL Editor and Run
--
-- NOTE: This creates the SCHEMA only. Auth users and test data
-- are created separately via Supabase Auth + setup.sql.
-- ============================================================

-- ============================================================
-- 1. ENUM TYPES (idempotent via DO blocks)
-- ============================================================

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('admin', 'reception', 'dentist'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE booking_status AS ENUM (
  'pending', 'approved', 'confirmed', 'completed', 'declined',
  'expired', 'reschedule_required', 'rescheduled',
  'pending_cancellation', 'cancelled', 'no_show'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE visit_status AS ENUM (
  'checked_in', 'waiting', 'in_consultation', 'consent_signed',
  'treatment_ongoing', 'checkout', 'completed', 'delayed',
  'treatment_paused', 'awaiting_requirement', 'resumed'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_status AS ENUM (
  'pending_payment', 'partially_paid', 'paid', 'payment_failed', 'refunded'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_method AS ENUM ('cash', 'gcash', 'maya', 'card', 'bank_transfer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE block_type AS ENUM ('vacation', 'break', 'sick_leave', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE recurrence_rule AS ENUM ('none', 'daily', 'weekly', 'monthly'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE conversation_status AS ENUM ('active', 'taken_over', 'ended', 'bot_handled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE message_direction AS ENUM ('inbound', 'outbound'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tooth_presence_type AS ENUM ('present', 'missing', 'impacted', 'unerupted'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tooth_finding_category AS ENUM ('condition', 'restoration', 'surgery'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tooth_surface AS ENUM ('mesial', 'distal', 'buccal', 'lingual', 'occlusal'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 2. TABLES
-- ============================================================

-- ============================================================
-- USERS (Staff accounts — Supabase Auth compatible)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
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
-- DENTISTS
-- ============================================================
CREATE TABLE IF NOT EXISTS dentists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  license_no TEXT NOT NULL UNIQUE,
  specialization TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- DENTIST_SCHEDULES
-- ============================================================
CREATE TABLE IF NOT EXISTS dentist_schedules (
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
-- DENTIST_BLOCKS
-- ============================================================
CREATE TABLE IF NOT EXISTS dentist_blocks (
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
-- CLINIC_SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS clinic_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  category TEXT NOT NULL,
  data_type TEXT NOT NULL DEFAULT 'string',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CLINIC_HOLIDAYS
-- ============================================================
CREATE TABLE IF NOT EXISTS clinic_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  description TEXT,
  is_half_day BOOLEAN NOT NULL DEFAULT false,
  operating_hours JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PATIENTS (expanded with PDA chart fields)
-- ============================================================
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  contact_no TEXT NOT NULL,
  email TEXT,
  birth_date DATE,
  medical_history TEXT,
  allergies TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  -- PDA Patient Information Record fields
  middle_name TEXT,
  sex TEXT CHECK (sex IN ('M', 'F')),
  nickname TEXT,
  religion TEXT,
  nationality TEXT,
  home_address TEXT,
  home_no TEXT,
  office_no TEXT,
  fax_no TEXT,
  occupation TEXT,
  dental_insurance TEXT,
  insurance_effective_date DATE,
  guardian_name TEXT,
  guardian_occupation TEXT,
  referred_by TEXT,
  consultation_reason TEXT,
  -- Messenger integration
  messenger_psid TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PATIENT_MEDICAL_RECORDS (1:1 with patients — PDA dental/medical history)
-- ============================================================
CREATE TABLE IF NOT EXISTS patient_medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
  -- Dental History
  previous_dentist TEXT,
  last_dental_visit DATE,
  -- Medical History — Physician
  physician_name TEXT,
  physician_specialty TEXT,
  physician_office_address TEXT,
  physician_office_no TEXT,
  -- Medical History — Screening Questions (Q1-8)
  is_in_good_health BOOLEAN,
  is_under_medical_treatment BOOLEAN,
  medical_treatment_condition TEXT,
  had_serious_illness_or_surgery BOOLEAN,
  illness_or_surgery_details TEXT,
  was_hospitalized BOOLEAN,
  hospitalization_details TEXT,
  taking_medication BOOLEAN,
  medication_details TEXT,
  uses_tobacco BOOLEAN,
  uses_alcohol_or_drugs BOOLEAN,
  -- Allergies (Q8 checklist)
  allergy_local_anesthetic BOOLEAN NOT NULL DEFAULT false,
  allergy_penicillin_antibiotics BOOLEAN NOT NULL DEFAULT false,
  allergy_sulfa_drugs BOOLEAN NOT NULL DEFAULT false,
  allergy_aspirin BOOLEAN NOT NULL DEFAULT false,
  allergy_latex BOOLEAN NOT NULL DEFAULT false,
  allergy_others TEXT,
  -- Q9-12
  bleeding_time TEXT,
  is_pregnant BOOLEAN,
  is_nursing BOOLEAN,
  taking_birth_control BOOLEAN,
  blood_type TEXT,
  blood_pressure TEXT,
  signed_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MEDICAL_CONDITIONS (lookup — Q13 checklist)
-- ============================================================
CREATE TABLE IF NOT EXISTS medical_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PATIENT_MEDICAL_CONDITIONS (M:N junction)
-- ============================================================
CREATE TABLE IF NOT EXISTS patient_medical_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  condition_id UUID NOT NULL REFERENCES medical_conditions(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_patient_condition UNIQUE (patient_id, condition_id)
);

-- ============================================================
-- DENTAL_SERVICES
-- ============================================================
CREATE TABLE IF NOT EXISTS dental_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  default_duration_minutes INTEGER NOT NULL CHECK (default_duration_minutes > 0),
  default_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (default_price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- APPOINTMENTS (Triple status model)
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
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
-- APPOINTMENT_SERVICES (M:N junction)
-- ============================================================
CREATE TABLE IF NOT EXISTS appointment_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES dental_services(id) ON DELETE RESTRICT,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_appointment_service UNIQUE (appointment_id, service_id)
);

-- ============================================================
-- APPOINTMENT_HISTORY (Audit trail — INSERT only via trigger)
-- ============================================================
CREATE TABLE IF NOT EXISTS appointment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- QR_CODES
-- ============================================================
CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  is_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CONSENT_FORMS
-- ============================================================
CREATE TABLE IF NOT EXISTS consent_forms (
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
-- CONSENT_CLAUSES (lookup — PDA informed consent clauses)
-- ============================================================
CREATE TABLE IF NOT EXISTS consent_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clause_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body_text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CONSENT_FORM_CLAUSES (M:N — per-form clause selection + patient initials)
-- ============================================================
CREATE TABLE IF NOT EXISTS consent_form_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_form_id UUID NOT NULL REFERENCES consent_forms(id) ON DELETE CASCADE,
  clause_id UUID NOT NULL REFERENCES consent_clauses(id) ON DELETE RESTRICT,
  patient_initials TEXT,
  initialed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_consent_form_clause UNIQUE (consent_form_id, clause_id)
);

-- ============================================================
-- TREATMENT_RECORDS (1:1 with appointments)
-- ============================================================
CREATE TABLE IF NOT EXISTS treatment_records (
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
-- INVOICES
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  payment_status payment_status NOT NULL DEFAULT 'pending_payment',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
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
-- PAYMENT_RECEIPT_VERSIONS (receipt replacement request & approval flow)
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_receipt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  version_number INT,
  proof_image_url TEXT NOT NULL,
  correction_reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reviewed_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- ============================================================
-- PRESCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  dentist_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  prescription_no TEXT NOT NULL UNIQUE,
  ptr_no TEXT,
  s2_license_no TEXT,
  clinic_name TEXT NOT NULL DEFAULT 'Smile Dental Clinic',
  clinic_address TEXT DEFAULT '123 Healthcare Way, Suite 400',
  clinic_contact TEXT DEFAULT '+63 917 123 4567',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PRESCRIPTION_ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  generic_name TEXT,
  dosage TEXT NOT NULL,
  duration TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- DENTAL_CHARTS (PDA Dental Record Chart — per-patient chart metadata)
-- ============================================================
CREATE TABLE IF NOT EXISTS dental_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
  -- Periodontal Screening
  periodontal_gingivitis BOOLEAN NOT NULL DEFAULT false,
  periodontal_early_periodontitis BOOLEAN NOT NULL DEFAULT false,
  periodontal_moderate_periodontitis BOOLEAN NOT NULL DEFAULT false,
  periodontal_advanced_periodontitis BOOLEAN NOT NULL DEFAULT false,
  -- Occlusion
  occlusion_class_molar BOOLEAN NOT NULL DEFAULT false,
  occlusion_overjet BOOLEAN NOT NULL DEFAULT false,
  occlusion_overbite BOOLEAN NOT NULL DEFAULT false,
  occlusion_midline_deviation BOOLEAN NOT NULL DEFAULT false,
  occlusion_crossbite BOOLEAN NOT NULL DEFAULT false,
  -- Appliances
  appliance_orthodontic BOOLEAN NOT NULL DEFAULT false,
  appliance_stayplate BOOLEAN NOT NULL DEFAULT false,
  appliance_others TEXT,
  -- TMD
  tmd_clenching BOOLEAN NOT NULL DEFAULT false,
  tmd_clicking BOOLEAN NOT NULL DEFAULT false,
  tmd_trismus BOOLEAN NOT NULL DEFAULT false,
  tmd_muscle_spasm BOOLEAN NOT NULL DEFAULT false,
  -- X-ray Taken
  xray_periapical BOOLEAN NOT NULL DEFAULT false,
  xray_periapical_tooth_no TEXT,
  xray_panoramic BOOLEAN NOT NULL DEFAULT false,
  xray_cephalometric BOOLEAN NOT NULL DEFAULT false,
  xray_occlusal BOOLEAN NOT NULL DEFAULT false,
  xray_others TEXT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TOOTH_PRESENCE (baseline presence status — one row per tooth)
-- ============================================================
CREATE TABLE IF NOT EXISTS tooth_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dental_chart_id UUID NOT NULL REFERENCES dental_charts(id) ON DELETE CASCADE,
  tooth_number SMALLINT NOT NULL CHECK (tooth_number BETWEEN 11 AND 85),
  presence tooth_presence_type NOT NULL DEFAULT 'present',
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_tooth_presence UNIQUE (dental_chart_id, tooth_number)
);

-- ============================================================
-- TOOTH_FINDINGS (many findings per tooth — condition/restoration/surgery)
-- ============================================================
CREATE TABLE IF NOT EXISTS tooth_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dental_chart_id UUID NOT NULL REFERENCES dental_charts(id) ON DELETE CASCADE,
  tooth_number SMALLINT NOT NULL CHECK (tooth_number BETWEEN 11 AND 85),
  category tooth_finding_category NOT NULL,
  code TEXT NOT NULL,
  notes TEXT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- FINDING_SURFACES (N:M link between findings and surfaces)
-- ============================================================
CREATE TABLE IF NOT EXISTS finding_surfaces (
  finding_id UUID NOT NULL REFERENCES tooth_findings(id) ON DELETE CASCADE,
  surface tooth_surface NOT NULL,
  PRIMARY KEY (finding_id, surface)
);

-- ============================================================
-- DENTAL_CHART_HISTORY (field-level audit trail — INSERT only, immutable)
-- ============================================================
CREATE TABLE IF NOT EXISTS dental_chart_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dental_chart_id UUID NOT NULL REFERENCES dental_charts(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('chart_meta', 'tooth_presence', 'tooth_finding')),
  entity_id UUID,
  tooth_number SMALLINT,
  field TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- DENTAL_CHART_SNAPSHOTS (full chart state per visit — JSONB)
-- ============================================================
CREATE TABLE IF NOT EXISTS dental_chart_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dental_chart_id UUID NOT NULL REFERENCES dental_charts(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  snapshot_data JSONB NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_chart_appointment_snapshot UNIQUE (dental_chart_id, appointment_id)
);

-- ============================================================
-- WAITLIST_ENTRIES
-- ============================================================
CREATE TABLE IF NOT EXISTS waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  requested_date DATE NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AUDIT_LOGS (IMMUTABLE — INSERT only)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MESSENGER_CONVERSATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS messenger_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_psid TEXT NOT NULL,
  status conversation_status NOT NULL DEFAULT 'active',
  taken_over_by UUID REFERENCES users(id) ON DELETE SET NULL,
  taken_over_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- BOOKING_SESSIONS (Messenger booking conversation state — DB-backed)
-- ============================================================
CREATE TABLE IF NOT EXISTS booking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_psid TEXT NOT NULL UNIQUE,
  conversation_id UUID NOT NULL REFERENCES messenger_conversations(id) ON DELETE CASCADE,
  step TEXT NOT NULL DEFAULT 'awaiting_date',
  collected_date DATE,
  collected_time TIME WITHOUT TIME ZONE,
  collected_service_ids TEXT[],
  collected_dentist_id UUID REFERENCES dentists(id) ON DELETE SET NULL,
  reschedule_appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MESSENGER_MESSAGES (INSERT only — immutable)
-- ============================================================
CREATE TABLE IF NOT EXISTS messenger_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES messenger_conversations(id) ON DELETE CASCADE,
  direction message_direction NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- REASSIGNMENT_LOGS (INSERT only — immutable)
-- ============================================================
CREATE TABLE IF NOT EXISTS reassignment_logs (
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
-- 3. INDEXES
-- ============================================================

-- Patient search
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients (last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_patients_contact ON patients (contact_no);
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients (email);
CREATE INDEX IF NOT EXISTS idx_patients_messenger_psid ON patients (messenger_psid) WHERE messenger_psid IS NOT NULL;

-- Appointment queries
CREATE INDEX IF NOT EXISTS idx_appointments_date_dentist ON appointments (scheduled_date, dentist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_booking_status ON appointments (booking_status);
CREATE INDEX IF NOT EXISTS idx_appointments_visit_status ON appointments (visit_status);
CREATE INDEX IF NOT EXISTS idx_appointments_payment_status ON appointments (payment_status);
CREATE INDEX IF NOT EXISTS idx_appointments_reference ON appointments (reference_no);

-- QR code validation
CREATE INDEX IF NOT EXISTS idx_qr_codes_token ON qr_codes (token);

-- Audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs (user_id, timestamp);

-- Messenger
CREATE INDEX IF NOT EXISTS idx_messenger_conversations_psid ON messenger_conversations (patient_psid);
CREATE INDEX IF NOT EXISTS idx_messenger_conversations_status ON messenger_conversations (status);
CREATE INDEX IF NOT EXISTS idx_messenger_messages_unread ON messenger_messages (conversation_id, is_read) WHERE is_read = false;

-- Waitlist (FIFO ordering)
CREATE INDEX IF NOT EXISTS idx_waitlist_date_joined ON waitlist_entries (requested_date, joined_at);

-- Dentist schedule lookups
CREATE INDEX IF NOT EXISTS idx_dentist_schedules_dentist ON dentist_schedules (dentist_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_dentist_blocks_dentist ON dentist_blocks (dentist_id, start_datetime);

-- Booking sessions
CREATE INDEX IF NOT EXISTS idx_booking_sessions_psid ON booking_sessions (patient_psid);
CREATE INDEX IF NOT EXISTS idx_booking_sessions_step ON booking_sessions (step);
CREATE INDEX IF NOT EXISTS idx_booking_sessions_created_at ON booking_sessions (created_at);

-- Patient medical records
CREATE INDEX IF NOT EXISTS idx_patient_medical_records_patient ON patient_medical_records (patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_medical_conditions_patient ON patient_medical_conditions (patient_id);

-- Consent form clauses
CREATE INDEX IF NOT EXISTS idx_consent_form_clauses_form ON consent_form_clauses (consent_form_id);

-- Dental chart (dental_charts.patient_id UNIQUE already indexed)
CREATE INDEX IF NOT EXISTS idx_tooth_presence_chart ON tooth_presence (dental_chart_id);
CREATE INDEX IF NOT EXISTS idx_tooth_findings_chart ON tooth_findings (dental_chart_id);
CREATE INDEX IF NOT EXISTS idx_tooth_findings_tooth ON tooth_findings (dental_chart_id, tooth_number);
CREATE INDEX IF NOT EXISTS idx_finding_surfaces_finding ON finding_surfaces (finding_id);
CREATE INDEX IF NOT EXISTS idx_dental_chart_history_chart ON dental_chart_history (dental_chart_id);
CREATE INDEX IF NOT EXISTS idx_dental_chart_history_changed_at ON dental_chart_history (changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_dental_chart_snapshots_chart ON dental_chart_snapshots (dental_chart_id);
CREATE INDEX IF NOT EXISTS idx_dental_chart_snapshots_appointment ON dental_chart_snapshots (appointment_id);

-- ============================================================
-- 4. TRIGGER FUNCTIONS
-- ============================================================

-- updated_at column auto-update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Prevent audit_logs modification (immutable)
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is immutable — modification not allowed' USING ERRCODE = 'raise_exception';
END;
$$ LANGUAGE plpgsql;

-- Helper: get current user's application role (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

-- Helper: get current user's dentist_id (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_current_dentist_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM dentists WHERE user_id = auth.uid();
$$;

-- Helper: resolve changed_by UUID (null → fallback to admin)
CREATE OR REPLACE FUNCTION resolve_changed_by()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changed_by UUID;
BEGIN
  v_changed_by := COALESCE(auth.uid(), (SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1));
  IF v_changed_by IS NULL THEN
    SELECT id INTO v_changed_by FROM users LIMIT 1;
  END IF;
  RETURN v_changed_by;
END;
$$;

-- Validate appointment status transitions (BEFORE UPDATE)
CREATE OR REPLACE FUNCTION validate_appointment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only validate if booking_status is changing
  IF NEW.booking_status IS DISTINCT FROM OLD.booking_status THEN
    IF NOT (
      (OLD.booking_status = 'pending' AND NEW.booking_status IN ('approved', 'declined', 'expired')) OR
      (OLD.booking_status = 'approved' AND NEW.booking_status IN ('confirmed', 'reschedule_required', 'pending_cancellation', 'cancelled', 'no_show', 'completed')) OR
      (OLD.booking_status = 'confirmed' AND NEW.booking_status IN ('reschedule_required', 'pending_cancellation', 'cancelled', 'no_show', 'completed')) OR
      (OLD.booking_status = 'reschedule_required' AND NEW.booking_status IN ('rescheduled')) OR
      (OLD.booking_status = 'rescheduled' AND NEW.booking_status IN ('approved', 'confirmed', 'pending_cancellation', 'cancelled', 'no_show', 'completed')) OR
      (OLD.booking_status = 'pending_cancellation' AND NEW.booking_status IN ('cancelled'))
    ) THEN
      RAISE EXCEPTION 'Invalid booking_status transition: % -> %', OLD.booking_status, NEW.booking_status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Only validate if visit_status is changing
  IF NEW.visit_status IS DISTINCT FROM OLD.visit_status THEN
    IF NOT (
      (OLD.visit_status IS NULL AND NEW.visit_status IN ('checked_in')) OR
      (OLD.visit_status = 'checked_in' AND NEW.visit_status IN ('waiting', 'delayed', 'in_consultation')) OR
      (OLD.visit_status = 'waiting' AND NEW.visit_status IN ('in_consultation', 'delayed')) OR
      (OLD.visit_status = 'delayed' AND NEW.visit_status IN ('waiting')) OR
      (OLD.visit_status = 'in_consultation' AND NEW.visit_status IN ('treatment_ongoing', 'checkout')) OR
      (OLD.visit_status = 'treatment_ongoing' AND NEW.visit_status IN ('treatment_paused', 'completed', 'checkout')) OR
      (OLD.visit_status = 'treatment_paused' AND NEW.visit_status IN ('treatment_ongoing', 'completed', 'checkout')) OR
      (OLD.visit_status = 'checkout' AND NEW.visit_status IN ('completed'))
    ) THEN
      RAISE EXCEPTION 'Invalid visit_status transition: % -> %', OLD.visit_status, NEW.visit_status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Log appointment history (AFTER UPDATE — SECURITY DEFINER)
CREATE OR REPLACE FUNCTION log_appointment_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changed_by UUID;
BEGIN
  v_changed_by := COALESCE(auth.uid(), (SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1));
  IF v_changed_by IS NULL THEN
    SELECT id INTO v_changed_by FROM users LIMIT 1;
  END IF;

  IF NEW.booking_status IS DISTINCT FROM OLD.booking_status THEN
    INSERT INTO appointment_history (appointment_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'booking_status', OLD.booking_status::TEXT, NEW.booking_status::TEXT);
  END IF;

  IF NEW.visit_status IS DISTINCT FROM OLD.visit_status THEN
    INSERT INTO appointment_history (appointment_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'visit_status', OLD.visit_status::TEXT, NEW.visit_status::TEXT);
  END IF;

  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    INSERT INTO appointment_history (appointment_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'payment_status', OLD.payment_status::TEXT, NEW.payment_status::TEXT);
  END IF;

  IF NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date THEN
    INSERT INTO appointment_history (appointment_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'scheduled_date', OLD.scheduled_date::TEXT, NEW.scheduled_date::TEXT);
  END IF;

  IF NEW.scheduled_time IS DISTINCT FROM OLD.scheduled_time THEN
    INSERT INTO appointment_history (appointment_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'scheduled_time', OLD.scheduled_time::TEXT, NEW.scheduled_time::TEXT);
  END IF;

  IF NEW.dentist_id IS DISTINCT FROM OLD.dentist_id THEN
    INSERT INTO appointment_history (appointment_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'dentist_id', OLD.dentist_id::TEXT, NEW.dentist_id::TEXT);
  END IF;

  RETURN NEW;
END;
$$;

-- Invalidate QR code (BEFORE UPDATE)
CREATE OR REPLACE FUNCTION invalidate_qr_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_used = true AND OLD.is_used = false AND NEW.used_at IS NULL THEN
    NEW.used_at = now();
  END IF;
  IF OLD.is_used = true AND NEW.is_used = false THEN
    RAISE EXCEPTION 'QR code already used — cannot reset is_used'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update invoice payment status (AFTER INSERT/UPDATE on payments — SECURITY DEFINER)
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_total NUMERIC(12, 2);
  v_paid NUMERIC(12, 2);
  v_new_status payment_status;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  SELECT total_amount INTO v_total FROM invoices WHERE id = v_invoice_id;
  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM payments WHERE invoice_id = v_invoice_id;

  IF v_paid >= v_total AND v_total > 0 THEN
    v_new_status := 'paid';
  ELSIF v_paid > 0 AND v_paid < v_total THEN
    v_new_status := 'partially_paid';
  ELSE
    v_new_status := 'pending_payment';
  END IF;

  UPDATE invoices SET payment_status = v_new_status WHERE id = v_invoice_id;
  UPDATE appointments SET payment_status = v_new_status
  WHERE id = (SELECT appointment_id FROM invoices WHERE id = v_invoice_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Auto-generate reference_no (BEFORE INSERT on appointments)
CREATE OR REPLACE FUNCTION generate_reference_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_no IS NULL OR NEW.reference_no = '' THEN
    NEW.reference_no := 'REF-' || to_char(now(), 'YYYYMMDD') || '-' || substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Atomically apply multiple clinic_settings value updates in a single
-- transaction (function body runs inside the caller's transaction, so a
-- failure on any row rolls back all of them). SECURITY INVOKER (default) —
-- runs with the caller's privileges, so the existing clinic_settings_update
-- RLS policy (admin-only) still applies to every row.
CREATE OR REPLACE FUNCTION bulk_update_clinic_settings(updates JSONB)
RETURNS VOID AS $$
DECLARE
  item JSONB;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    UPDATE clinic_settings
    SET setting_value = item->>'setting_value',
        updated_at = now()
    WHERE id = (item->>'id')::UUID;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Dental chart meta history (AFTER INSERT/UPDATE on dental_charts)
CREATE OR REPLACE FUNCTION log_dental_chart_meta_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_by_uuid UUID;
BEGIN
  changed_by_uuid := resolve_changed_by();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO dental_chart_history
      (dental_chart_id, changed_by, action, entity_type, entity_id, field, new_value)
    VALUES
      (NEW.id, changed_by_uuid, 'insert', 'chart_meta', NEW.id, 'created', NEW.patient_id::TEXT);
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO dental_chart_history
      (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value)
    VALUES
      (OLD.id, changed_by_uuid, 'delete', 'chart_meta', OLD.id, 'deleted', OLD.patient_id::TEXT);
    RETURN OLD;
  END IF;

  -- UPDATE: log each changed boolean/text field
  IF NEW.periodontal_gingivitis IS DISTINCT FROM OLD.periodontal_gingivitis THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'periodontal_gingivitis', OLD.periodontal_gingivitis::TEXT, NEW.periodontal_gingivitis::TEXT);
  END IF;
  IF NEW.periodontal_early_periodontitis IS DISTINCT FROM OLD.periodontal_early_periodontitis THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'periodontal_early_periodontitis', OLD.periodontal_early_periodontitis::TEXT, NEW.periodontal_early_periodontitis::TEXT);
  END IF;
  IF NEW.periodontal_moderate_periodontitis IS DISTINCT FROM OLD.periodontal_moderate_periodontitis THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'periodontal_moderate_periodontitis', OLD.periodontal_moderate_periodontitis::TEXT, NEW.periodontal_moderate_periodontitis::TEXT);
  END IF;
  IF NEW.periodontal_advanced_periodontitis IS DISTINCT FROM OLD.periodontal_advanced_periodontitis THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'periodontal_advanced_periodontitis', OLD.periodontal_advanced_periodontitis::TEXT, NEW.periodontal_advanced_periodontitis::TEXT);
  END IF;
  IF NEW.occlusion_class_molar IS DISTINCT FROM OLD.occlusion_class_molar THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'occlusion_class_molar', OLD.occlusion_class_molar::TEXT, NEW.occlusion_class_molar::TEXT);
  END IF;
  IF NEW.occlusion_overjet IS DISTINCT FROM OLD.occlusion_overjet THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'occlusion_overjet', OLD.occlusion_overjet::TEXT, NEW.occlusion_overjet::TEXT);
  END IF;
  IF NEW.occlusion_overbite IS DISTINCT FROM OLD.occlusion_overbite THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'occlusion_overbite', OLD.occlusion_overbite::TEXT, NEW.occlusion_overbite::TEXT);
  END IF;
  IF NEW.occlusion_midline_deviation IS DISTINCT FROM OLD.occlusion_midline_deviation THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'occlusion_midline_deviation', OLD.occlusion_midline_deviation::TEXT, NEW.occlusion_midline_deviation::TEXT);
  END IF;
  IF NEW.occlusion_crossbite IS DISTINCT FROM OLD.occlusion_crossbite THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'occlusion_crossbite', OLD.occlusion_crossbite::TEXT, NEW.occlusion_crossbite::TEXT);
  END IF;
  IF NEW.appliance_orthodontic IS DISTINCT FROM OLD.appliance_orthodontic THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'appliance_orthodontic', OLD.appliance_orthodontic::TEXT, NEW.appliance_orthodontic::TEXT);
  END IF;
  IF NEW.appliance_stayplate IS DISTINCT FROM OLD.appliance_stayplate THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'appliance_stayplate', OLD.appliance_stayplate::TEXT, NEW.appliance_stayplate::TEXT);
  END IF;
  IF NEW.appliance_others IS DISTINCT FROM OLD.appliance_others THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'appliance_others', OLD.appliance_others, NEW.appliance_others);
  END IF;
  IF NEW.tmd_clenching IS DISTINCT FROM OLD.tmd_clenching THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'tmd_clenching', OLD.tmd_clenching::TEXT, NEW.tmd_clenching::TEXT);
  END IF;
  IF NEW.tmd_clicking IS DISTINCT FROM OLD.tmd_clicking THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'tmd_clicking', OLD.tmd_clicking::TEXT, NEW.tmd_clicking::TEXT);
  END IF;
  IF NEW.tmd_trismus IS DISTINCT FROM OLD.tmd_trismus THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'tmd_trismus', OLD.tmd_trismus::TEXT, NEW.tmd_trismus::TEXT);
  END IF;
  IF NEW.tmd_muscle_spasm IS DISTINCT FROM OLD.tmd_muscle_spasm THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'tmd_muscle_spasm', OLD.tmd_muscle_spasm::TEXT, NEW.tmd_muscle_spasm::TEXT);
  END IF;
  IF NEW.xray_periapical IS DISTINCT FROM OLD.xray_periapical THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'xray_periapical', OLD.xray_periapical::TEXT, NEW.xray_periapical::TEXT);
  END IF;
  IF NEW.xray_periapical_tooth_no IS DISTINCT FROM OLD.xray_periapical_tooth_no THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'xray_periapical_tooth_no', OLD.xray_periapical_tooth_no, NEW.xray_periapical_tooth_no);
  END IF;
  IF NEW.xray_panoramic IS DISTINCT FROM OLD.xray_panoramic THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'xray_panoramic', OLD.xray_panoramic::TEXT, NEW.xray_panoramic::TEXT);
  END IF;
  IF NEW.xray_cephalometric IS DISTINCT FROM OLD.xray_cephalometric THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'xray_cephalometric', OLD.xray_cephalometric::TEXT, NEW.xray_cephalometric::TEXT);
  END IF;
  IF NEW.xray_occlusal IS DISTINCT FROM OLD.xray_occlusal THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'xray_occlusal', OLD.xray_occlusal::TEXT, NEW.xray_occlusal::TEXT);
  END IF;
  IF NEW.xray_others IS DISTINCT FROM OLD.xray_others THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'xray_others', OLD.xray_others, NEW.xray_others);
  END IF;

  RETURN NEW;
END;
$$;

-- Tooth presence history (AFTER INSERT/UPDATE/DELETE)
CREATE OR REPLACE FUNCTION log_tooth_presence_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_by_uuid UUID;
BEGIN
  changed_by_uuid := resolve_changed_by();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO dental_chart_history
      (dental_chart_id, changed_by, action, entity_type, entity_id, tooth_number, field, new_value)
    VALUES
      (NEW.dental_chart_id, changed_by_uuid, 'insert', 'tooth_presence', NEW.id, NEW.tooth_number, 'presence', NEW.presence::TEXT);
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO dental_chart_history
      (dental_chart_id, changed_by, action, entity_type, entity_id, tooth_number, field, old_value)
    VALUES
      (OLD.dental_chart_id, changed_by_uuid, 'delete', 'tooth_presence', OLD.id, OLD.tooth_number, 'presence', OLD.presence::TEXT);
    RETURN OLD;
  END IF;

  IF NEW.presence IS DISTINCT FROM OLD.presence THEN
    INSERT INTO dental_chart_history
      (dental_chart_id, changed_by, action, entity_type, entity_id, tooth_number, field, old_value, new_value)
    VALUES
      (NEW.dental_chart_id, changed_by_uuid, 'update', 'tooth_presence', NEW.id, NEW.tooth_number, 'presence', OLD.presence::TEXT, NEW.presence::TEXT);
  END IF;

  RETURN NEW;
END;
$$;

-- Tooth findings history (AFTER INSERT/UPDATE/DELETE)
CREATE OR REPLACE FUNCTION log_tooth_findings_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_by_uuid UUID;
BEGIN
  changed_by_uuid := resolve_changed_by();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO dental_chart_history
      (dental_chart_id, changed_by, action, entity_type, entity_id, tooth_number, field, new_value)
    VALUES
      (NEW.dental_chart_id, changed_by_uuid, 'insert', 'tooth_finding', NEW.id, NEW.tooth_number, 'code', NEW.code);
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO dental_chart_history
      (dental_chart_id, changed_by, action, entity_type, entity_id, tooth_number, field, old_value)
    VALUES
      (OLD.dental_chart_id, changed_by_uuid, 'delete', 'tooth_finding', OLD.id, OLD.tooth_number, 'code', OLD.code);
    RETURN OLD;
  END IF;

  IF NEW.code IS DISTINCT FROM OLD.code THEN
    INSERT INTO dental_chart_history
      (dental_chart_id, changed_by, action, entity_type, entity_id, tooth_number, field, old_value, new_value)
    VALUES
      (NEW.dental_chart_id, changed_by_uuid, 'update', 'tooth_finding', NEW.id, NEW.tooth_number, 'code', OLD.code, NEW.code);
  END IF;
  IF NEW.category IS DISTINCT FROM OLD.category THEN
    INSERT INTO dental_chart_history
      (dental_chart_id, changed_by, action, entity_type, entity_id, tooth_number, field, old_value, new_value)
    VALUES
      (NEW.dental_chart_id, changed_by_uuid, 'update', 'tooth_finding', NEW.id, NEW.tooth_number, 'category', OLD.category::TEXT, NEW.category::TEXT);
  END IF;
  IF NEW.notes IS DISTINCT FROM OLD.notes THEN
    INSERT INTO dental_chart_history
      (dental_chart_id, changed_by, action, entity_type, entity_id, tooth_number, field, old_value, new_value)
    VALUES
      (NEW.dental_chart_id, changed_by_uuid, 'update', 'tooth_finding', NEW.id, NEW.tooth_number, 'notes', OLD.notes, NEW.notes);
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 5. TRIGGERS
-- ============================================================

-- updated_at triggers (all tables with updated_at)
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_dentists_updated_at ON dentists;
CREATE TRIGGER trg_dentists_updated_at BEFORE UPDATE ON dentists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_dentist_schedules_updated_at ON dentist_schedules;
CREATE TRIGGER trg_dentist_schedules_updated_at BEFORE UPDATE ON dentist_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_dentist_blocks_updated_at ON dentist_blocks;
CREATE TRIGGER trg_dentist_blocks_updated_at BEFORE UPDATE ON dentist_blocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_clinic_settings_updated_at ON clinic_settings;
CREATE TRIGGER trg_clinic_settings_updated_at BEFORE UPDATE ON clinic_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_clinic_holidays_updated_at ON clinic_holidays;
CREATE TRIGGER trg_clinic_holidays_updated_at BEFORE UPDATE ON clinic_holidays FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_patients_updated_at ON patients;
CREATE TRIGGER trg_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_dental_services_updated_at ON dental_services;
CREATE TRIGGER trg_dental_services_updated_at BEFORE UPDATE ON dental_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_appointments_updated_at ON appointments;
CREATE TRIGGER trg_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_consent_forms_updated_at ON consent_forms;
CREATE TRIGGER trg_consent_forms_updated_at BEFORE UPDATE ON consent_forms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_treatment_records_updated_at ON treatment_records;
CREATE TRIGGER trg_treatment_records_updated_at BEFORE UPDATE ON treatment_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_waitlist_entries_updated_at ON waitlist_entries;
CREATE TRIGGER trg_waitlist_entries_updated_at BEFORE UPDATE ON waitlist_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_messenger_conversations_updated_at ON messenger_conversations;
CREATE TRIGGER trg_messenger_conversations_updated_at BEFORE UPDATE ON messenger_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_patient_medical_records_updated_at ON patient_medical_records;
CREATE TRIGGER trg_patient_medical_records_updated_at BEFORE UPDATE ON patient_medical_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_dental_charts_updated_at ON dental_charts;
CREATE TRIGGER trg_dental_charts_updated_at BEFORE UPDATE ON dental_charts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_tooth_presence_updated_at ON tooth_presence;
CREATE TRIGGER trg_tooth_presence_updated_at BEFORE UPDATE ON tooth_presence FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_tooth_findings_updated_at ON tooth_findings;
CREATE TRIGGER trg_tooth_findings_updated_at BEFORE UPDATE ON tooth_findings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_booking_sessions_updated_at ON booking_sessions;
CREATE TRIGGER trg_booking_sessions_updated_at BEFORE UPDATE ON booking_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- audit_logs immutability
DROP TRIGGER IF EXISTS prevent_audit_log_update ON audit_logs;
CREATE TRIGGER prevent_audit_log_update BEFORE UPDATE ON audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();
DROP TRIGGER IF EXISTS prevent_audit_log_delete ON audit_logs;
CREATE TRIGGER prevent_audit_log_delete BEFORE DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

-- Appointment validation + history + reference_no
DROP TRIGGER IF EXISTS trg_appointment_status_validate ON appointments;
CREATE TRIGGER trg_appointment_status_validate BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION validate_appointment_status();
DROP TRIGGER IF EXISTS trg_appointment_history_log ON appointments;
CREATE TRIGGER trg_appointment_history_log AFTER UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION log_appointment_history();
DROP TRIGGER IF EXISTS trg_appointment_reference_no ON appointments;
CREATE TRIGGER trg_appointment_reference_no BEFORE INSERT ON appointments FOR EACH ROW EXECUTE FUNCTION generate_reference_no();

-- QR code invalidation
DROP TRIGGER IF EXISTS trg_qr_code_invalidate ON qr_codes;
CREATE TRIGGER trg_qr_code_invalidate BEFORE UPDATE ON qr_codes FOR EACH ROW EXECUTE FUNCTION invalidate_qr_code();

-- Payment status auto-calculation
DROP TRIGGER IF EXISTS trg_payment_status_update_insert ON payments;
CREATE TRIGGER trg_payment_status_update_insert AFTER INSERT ON payments FOR EACH ROW EXECUTE FUNCTION update_invoice_payment_status();
DROP TRIGGER IF EXISTS trg_payment_status_update_update ON payments;
CREATE TRIGGER trg_payment_status_update_update AFTER UPDATE OF amount, invoice_id ON payments FOR EACH ROW EXECUTE FUNCTION update_invoice_payment_status();

-- Dental chart history
DROP TRIGGER IF EXISTS trg_dental_chart_meta_history_insert ON dental_charts;
CREATE TRIGGER trg_dental_chart_meta_history_insert AFTER INSERT ON dental_charts FOR EACH ROW EXECUTE FUNCTION log_dental_chart_meta_history();
DROP TRIGGER IF EXISTS trg_dental_chart_meta_history_update ON dental_charts;
CREATE TRIGGER trg_dental_chart_meta_history_update AFTER UPDATE ON dental_charts FOR EACH ROW EXECUTE FUNCTION log_dental_chart_meta_history();
DROP TRIGGER IF EXISTS trg_tooth_presence_history_insert ON tooth_presence;
CREATE TRIGGER trg_tooth_presence_history_insert AFTER INSERT ON tooth_presence FOR EACH ROW EXECUTE FUNCTION log_tooth_presence_history();
DROP TRIGGER IF EXISTS trg_tooth_presence_history_update ON tooth_presence;
CREATE TRIGGER trg_tooth_presence_history_update AFTER UPDATE ON tooth_presence FOR EACH ROW EXECUTE FUNCTION log_tooth_presence_history();
DROP TRIGGER IF EXISTS trg_tooth_presence_history_delete ON tooth_presence;
CREATE TRIGGER trg_tooth_presence_history_delete AFTER DELETE ON tooth_presence FOR EACH ROW EXECUTE FUNCTION log_tooth_presence_history();
DROP TRIGGER IF EXISTS trg_tooth_findings_history_insert ON tooth_findings;
CREATE TRIGGER trg_tooth_findings_history_insert AFTER INSERT ON tooth_findings FOR EACH ROW EXECUTE FUNCTION log_tooth_findings_history();
DROP TRIGGER IF EXISTS trg_tooth_findings_history_update ON tooth_findings;
CREATE TRIGGER trg_tooth_findings_history_update AFTER UPDATE ON tooth_findings FOR EACH ROW EXECUTE FUNCTION log_tooth_findings_history();
DROP TRIGGER IF EXISTS trg_tooth_findings_history_delete ON tooth_findings;
CREATE TRIGGER trg_tooth_findings_history_delete AFTER DELETE ON tooth_findings FOR EACH ROW EXECUTE FUNCTION log_tooth_findings_history();

-- ============================================================
-- 6. ENABLE ROW LEVEL SECURITY (ALL TABLES)
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE dentists ENABLE ROW LEVEL SECURITY;
ALTER TABLE dentist_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE dentist_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_medical_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_form_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tooth_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE tooth_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE finding_surfaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_chart_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_chart_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messenger_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messenger_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reassignment_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. RLS POLICIES
-- ============================================================

-- USERS (all authenticated staff can read)
DROP POLICY IF EXISTS users_select ON users;
CREATE POLICY users_select ON users FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS users_insert ON users;
CREATE POLICY users_insert ON users FOR INSERT TO authenticated WITH CHECK (get_user_role() = 'admin');
DROP POLICY IF EXISTS users_update ON users;
CREATE POLICY users_update ON users FOR UPDATE TO authenticated
  USING (id = auth.uid() OR get_user_role() = 'admin')
  WITH CHECK (id = auth.uid() OR get_user_role() = 'admin');

-- DENTISTS (all staff can read)
DROP POLICY IF EXISTS dentists_select ON dentists;
CREATE POLICY dentists_select ON dentists FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS dentists_insert ON dentists;
CREATE POLICY dentists_insert ON dentists FOR INSERT TO authenticated WITH CHECK (get_user_role() = 'admin');
DROP POLICY IF EXISTS dentists_update ON dentists;
CREATE POLICY dentists_update ON dentists FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR get_user_role() = 'admin')
  WITH CHECK (user_id = auth.uid() OR get_user_role() = 'admin');

-- DENTIST_SCHEDULES (dentist + admin + reception)
DROP POLICY IF EXISTS dentist_schedules_select ON dentist_schedules;
CREATE POLICY dentist_schedules_select ON dentist_schedules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS dentist_schedules_insert ON dentist_schedules;
CREATE POLICY dentist_schedules_insert ON dentist_schedules FOR INSERT TO authenticated
  WITH CHECK (dentist_id = get_current_dentist_id() OR get_user_role() IN ('admin', 'reception'));
DROP POLICY IF EXISTS dentist_schedules_update ON dentist_schedules;
CREATE POLICY dentist_schedules_update ON dentist_schedules FOR UPDATE TO authenticated
  USING (dentist_id = get_current_dentist_id() OR get_user_role() IN ('admin', 'reception'))
  WITH CHECK (dentist_id = get_current_dentist_id() OR get_user_role() IN ('admin', 'reception'));
DROP POLICY IF EXISTS dentist_schedules_delete ON dentist_schedules;
CREATE POLICY dentist_schedules_delete ON dentist_schedules FOR DELETE TO authenticated
  USING (dentist_id = get_current_dentist_id() OR get_user_role() IN ('admin', 'reception'));

-- DENTIST_BLOCKS (dentist + admin + reception)
DROP POLICY IF EXISTS dentist_blocks_select ON dentist_blocks;
CREATE POLICY dentist_blocks_select ON dentist_blocks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS dentist_blocks_insert ON dentist_blocks;
CREATE POLICY dentist_blocks_insert ON dentist_blocks FOR INSERT TO authenticated
  WITH CHECK (dentist_id = get_current_dentist_id() OR get_user_role() IN ('admin', 'reception'));
DROP POLICY IF EXISTS dentist_blocks_update ON dentist_blocks;
CREATE POLICY dentist_blocks_update ON dentist_blocks FOR UPDATE TO authenticated
  USING (dentist_id = get_current_dentist_id() OR get_user_role() IN ('admin', 'reception'))
  WITH CHECK (dentist_id = get_current_dentist_id() OR get_user_role() IN ('admin', 'reception'));
DROP POLICY IF EXISTS dentist_blocks_delete ON dentist_blocks;
CREATE POLICY dentist_blocks_delete ON dentist_blocks FOR DELETE TO authenticated
  USING (dentist_id = get_current_dentist_id() OR get_user_role() IN ('admin', 'reception'));

-- CLINIC_SETTINGS (admin only for write)
DROP POLICY IF EXISTS clinic_settings_select ON clinic_settings;
CREATE POLICY clinic_settings_select ON clinic_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS clinic_settings_insert ON clinic_settings;
CREATE POLICY clinic_settings_insert ON clinic_settings FOR INSERT TO authenticated WITH CHECK (get_user_role() = 'admin');
DROP POLICY IF EXISTS clinic_settings_update ON clinic_settings;
CREATE POLICY clinic_settings_update ON clinic_settings FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');

-- CLINIC_HOLIDAYS (admin only for write)
DROP POLICY IF EXISTS clinic_holidays_select ON clinic_holidays;
CREATE POLICY clinic_holidays_select ON clinic_holidays FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS clinic_holidays_insert ON clinic_holidays;
CREATE POLICY clinic_holidays_insert ON clinic_holidays FOR INSERT TO authenticated WITH CHECK (get_user_role() = 'admin');
DROP POLICY IF EXISTS clinic_holidays_update ON clinic_holidays;
CREATE POLICY clinic_holidays_update ON clinic_holidays FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');
DROP POLICY IF EXISTS clinic_holidays_delete ON clinic_holidays;
CREATE POLICY clinic_holidays_delete ON clinic_holidays FOR DELETE TO authenticated USING (get_user_role() = 'admin');

-- PATIENTS (reception + dentist + admin for insert/update)
DROP POLICY IF EXISTS patients_select ON patients;
CREATE POLICY patients_select ON patients FOR SELECT TO authenticated
  USING (is_archived = false OR get_user_role() = 'admin');
DROP POLICY IF EXISTS patients_insert ON patients;
CREATE POLICY patients_insert ON patients FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('reception', 'dentist', 'admin'));
DROP POLICY IF EXISTS patients_update ON patients;
CREATE POLICY patients_update ON patients FOR UPDATE TO authenticated
  USING (get_user_role() IN ('reception', 'dentist', 'admin'))
  WITH CHECK (get_user_role() IN ('reception', 'dentist', 'admin'));

-- PATIENT_MEDICAL_RECORDS
DROP POLICY IF EXISTS patient_medical_records_select ON patient_medical_records;
CREATE POLICY patient_medical_records_select ON patient_medical_records FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));
DROP POLICY IF EXISTS patient_medical_records_insert ON patient_medical_records;
CREATE POLICY patient_medical_records_insert ON patient_medical_records FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'reception', 'dentist'));
DROP POLICY IF EXISTS patient_medical_records_update ON patient_medical_records;
CREATE POLICY patient_medical_records_update ON patient_medical_records FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));

-- MEDICAL_CONDITIONS (read-only lookup)
DROP POLICY IF EXISTS medical_conditions_select ON medical_conditions;
CREATE POLICY medical_conditions_select ON medical_conditions FOR SELECT TO authenticated USING (true);

-- PATIENT_MEDICAL_CONDITIONS
DROP POLICY IF EXISTS patient_medical_conditions_select ON patient_medical_conditions;
CREATE POLICY patient_medical_conditions_select ON patient_medical_conditions FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));
DROP POLICY IF EXISTS patient_medical_conditions_insert ON patient_medical_conditions;
CREATE POLICY patient_medical_conditions_insert ON patient_medical_conditions FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'reception', 'dentist'));
DROP POLICY IF EXISTS patient_medical_conditions_delete ON patient_medical_conditions;
CREATE POLICY patient_medical_conditions_delete ON patient_medical_conditions FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));

-- DENTAL_SERVICES (admin only for write)
DROP POLICY IF EXISTS dental_services_select ON dental_services;
CREATE POLICY dental_services_select ON dental_services FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS dental_services_insert ON dental_services;
CREATE POLICY dental_services_insert ON dental_services FOR INSERT TO authenticated WITH CHECK (get_user_role() = 'admin');
DROP POLICY IF EXISTS dental_services_update ON dental_services;
CREATE POLICY dental_services_update ON dental_services FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');
DROP POLICY IF EXISTS dental_services_delete ON dental_services;
CREATE POLICY dental_services_delete ON dental_services FOR DELETE TO authenticated USING (get_user_role() = 'admin');

-- APPOINTMENTS (role-based with dentist filtering)
DROP POLICY IF EXISTS appointments_select ON appointments;
CREATE POLICY appointments_select ON appointments FOR SELECT TO authenticated
  USING (
    CASE
      WHEN get_user_role() IN ('admin', 'reception') THEN true
      WHEN get_user_role() = 'dentist' THEN dentist_id = get_current_dentist_id()
      ELSE false
    END
  );
DROP POLICY IF EXISTS appointments_insert ON appointments;
CREATE POLICY appointments_insert ON appointments FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('reception', 'admin', 'dentist'));
DROP POLICY IF EXISTS appointments_update ON appointments;
CREATE POLICY appointments_update ON appointments FOR UPDATE TO authenticated
  USING (
    CASE
      WHEN get_user_role() IN ('admin', 'reception') THEN true
      WHEN get_user_role() = 'dentist' THEN dentist_id = get_current_dentist_id()
      ELSE false
    END
  )
  WITH CHECK (
    CASE
      WHEN get_user_role() IN ('admin', 'reception') THEN true
      WHEN get_user_role() = 'dentist' THEN dentist_id = get_current_dentist_id()
      ELSE false
    END
  );

-- APPOINTMENT_SERVICES (reception + admin + dentist)
DROP POLICY IF EXISTS appointment_services_select ON appointment_services;
CREATE POLICY appointment_services_select ON appointment_services FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS appointment_services_insert ON appointment_services;
CREATE POLICY appointment_services_insert ON appointment_services FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('reception', 'admin', 'dentist'));
DROP POLICY IF EXISTS appointment_services_update ON appointment_services;
CREATE POLICY appointment_services_update ON appointment_services FOR UPDATE TO authenticated
  USING (get_user_role() IN ('reception', 'admin', 'dentist'))
  WITH CHECK (get_user_role() IN ('reception', 'admin', 'dentist'));
DROP POLICY IF EXISTS appointment_services_delete ON appointment_services;
CREATE POLICY appointment_services_delete ON appointment_services FOR DELETE TO authenticated
  USING (get_user_role() IN ('reception', 'admin', 'dentist'));

-- APPOINTMENT_HISTORY (INSERT only via trigger — no user INSERT/UPDATE/DELETE)
DROP POLICY IF EXISTS appointment_history_select ON appointment_history;
CREATE POLICY appointment_history_select ON appointment_history FOR SELECT TO authenticated USING (true);

-- QR_CODES (all staff)
DROP POLICY IF EXISTS qr_codes_select ON qr_codes;
CREATE POLICY qr_codes_select ON qr_codes FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));
DROP POLICY IF EXISTS qr_codes_insert ON qr_codes;
CREATE POLICY qr_codes_insert ON qr_codes FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'reception', 'dentist'));
DROP POLICY IF EXISTS qr_codes_update ON qr_codes;
CREATE POLICY qr_codes_update ON qr_codes FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'))
  WITH CHECK (get_user_role() IN ('admin', 'reception', 'dentist'));

-- CONSENT_FORMS (dentist own + admin; UPDATE for signing)
DROP POLICY IF EXISTS consent_forms_select ON consent_forms;
CREATE POLICY consent_forms_select ON consent_forms FOR SELECT TO authenticated
  USING (
    CASE
      WHEN get_user_role() = 'admin' THEN true
      WHEN get_user_role() = 'dentist' THEN
        appointment_id IN (SELECT id FROM appointments WHERE dentist_id = get_current_dentist_id())
      ELSE false
    END
  );
DROP POLICY IF EXISTS consent_forms_insert ON consent_forms;
CREATE POLICY consent_forms_insert ON consent_forms FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('dentist', 'reception'));
DROP POLICY IF EXISTS consent_forms_update ON consent_forms;
CREATE POLICY consent_forms_update ON consent_forms FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));

-- CONSENT_CLAUSES (read-only lookup)
DROP POLICY IF EXISTS consent_clauses_select ON consent_clauses;
CREATE POLICY consent_clauses_select ON consent_clauses FOR SELECT TO authenticated USING (true);

-- CONSENT_FORM_CLAUSES
DROP POLICY IF EXISTS consent_form_clauses_select ON consent_form_clauses;
CREATE POLICY consent_form_clauses_select ON consent_form_clauses FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));
DROP POLICY IF EXISTS consent_form_clauses_insert ON consent_form_clauses;
CREATE POLICY consent_form_clauses_insert ON consent_form_clauses FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'dentist'));
DROP POLICY IF EXISTS consent_form_clauses_update ON consent_form_clauses;
CREATE POLICY consent_form_clauses_update ON consent_form_clauses FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));

-- TREATMENT_RECORDS (dentist own + admin)
DROP POLICY IF EXISTS treatment_records_select ON treatment_records;
CREATE POLICY treatment_records_select ON treatment_records FOR SELECT TO authenticated
  USING (
    CASE
      WHEN get_user_role() = 'admin' THEN true
      WHEN get_user_role() = 'dentist' THEN
        appointment_id IN (SELECT id FROM appointments WHERE dentist_id = get_current_dentist_id())
      ELSE false
    END
  );
DROP POLICY IF EXISTS treatment_records_insert ON treatment_records;
CREATE POLICY treatment_records_insert ON treatment_records FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'dentist');
DROP POLICY IF EXISTS treatment_records_update ON treatment_records;
CREATE POLICY treatment_records_update ON treatment_records FOR UPDATE TO authenticated
  USING (
    CASE
      WHEN get_user_role() = 'admin' THEN true
      WHEN get_user_role() = 'dentist' THEN
        appointment_id IN (SELECT id FROM appointments WHERE dentist_id = get_current_dentist_id())
      ELSE false
    END
  )
  WITH CHECK (
    CASE
      WHEN get_user_role() = 'admin' THEN true
      WHEN get_user_role() = 'dentist' THEN
        appointment_id IN (SELECT id FROM appointments WHERE dentist_id = get_current_dentist_id())
      ELSE false
    END
  );

-- INVOICES (reception + admin + dentist)
DROP POLICY IF EXISTS invoices_select ON invoices;
CREATE POLICY invoices_select ON invoices FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS invoices_insert ON invoices;
CREATE POLICY invoices_insert ON invoices FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('reception', 'admin', 'dentist'));
DROP POLICY IF EXISTS invoices_update ON invoices;
CREATE POLICY invoices_update ON invoices FOR UPDATE TO authenticated
  USING (get_user_role() IN ('reception', 'admin', 'dentist'))
  WITH CHECK (get_user_role() IN ('reception', 'admin', 'dentist'));

-- PAYMENTS (reception + admin + dentist)
DROP POLICY IF EXISTS payments_select ON payments;
CREATE POLICY payments_select ON payments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS payments_insert ON payments;
CREATE POLICY payments_insert ON payments FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('reception', 'admin', 'dentist'));
DROP POLICY IF EXISTS payments_update ON payments;
CREATE POLICY payments_update ON payments FOR UPDATE TO authenticated
  USING (get_user_role() IN ('reception', 'admin', 'dentist'))
  WITH CHECK (get_user_role() IN ('reception', 'admin', 'dentist'));

-- PAYMENT_RECEIPT_VERSIONS (staff read/insert, admin update)
DROP POLICY IF EXISTS "Staff can view receipt versions" ON payment_receipt_versions;
CREATE POLICY "Staff can view receipt versions" ON payment_receipt_versions FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));
DROP POLICY IF EXISTS "Staff can insert receipt versions" ON payment_receipt_versions;
CREATE POLICY "Staff can insert receipt versions" ON payment_receipt_versions FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'reception', 'dentist'));
DROP POLICY IF EXISTS "Admin can update receipt versions" ON payment_receipt_versions;
CREATE POLICY "Admin can update receipt versions" ON payment_receipt_versions FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin');

-- PRESCRIPTIONS (all staff)
DROP POLICY IF EXISTS "Staff can view prescriptions" ON prescriptions;
CREATE POLICY "Staff can view prescriptions" ON prescriptions FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));
DROP POLICY IF EXISTS "Staff can insert prescriptions" ON prescriptions;
CREATE POLICY "Staff can insert prescriptions" ON prescriptions FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'reception', 'dentist'));
DROP POLICY IF EXISTS "Staff can delete prescriptions" ON prescriptions;
CREATE POLICY "Staff can delete prescriptions" ON prescriptions FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));

-- PRESCRIPTION_ITEMS (all staff)
DROP POLICY IF EXISTS "Staff can view prescription items" ON prescription_items;
CREATE POLICY "Staff can view prescription items" ON prescription_items FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));
DROP POLICY IF EXISTS "Staff can insert prescription items" ON prescription_items;
CREATE POLICY "Staff can insert prescription items" ON prescription_items FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'reception', 'dentist'));
DROP POLICY IF EXISTS "Staff can delete prescription items" ON prescription_items;
CREATE POLICY "Staff can delete prescription items" ON prescription_items FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));

-- DENTAL_CHARTS (admin + dentist)
DROP POLICY IF EXISTS dental_charts_select ON dental_charts;
CREATE POLICY dental_charts_select ON dental_charts FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));
DROP POLICY IF EXISTS dental_charts_insert ON dental_charts;
CREATE POLICY dental_charts_insert ON dental_charts FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'dentist'));
DROP POLICY IF EXISTS dental_charts_update ON dental_charts;
CREATE POLICY dental_charts_update ON dental_charts FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'dentist'))
  WITH CHECK (get_user_role() IN ('admin', 'dentist'));

-- TOOTH_PRESENCE
DROP POLICY IF EXISTS tooth_presence_select ON tooth_presence;
CREATE POLICY tooth_presence_select ON tooth_presence FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));
DROP POLICY IF EXISTS tooth_presence_insert ON tooth_presence;
CREATE POLICY tooth_presence_insert ON tooth_presence FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'dentist'));
DROP POLICY IF EXISTS tooth_presence_update ON tooth_presence;
CREATE POLICY tooth_presence_update ON tooth_presence FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'dentist'))
  WITH CHECK (get_user_role() IN ('admin', 'dentist'));
DROP POLICY IF EXISTS tooth_presence_delete ON tooth_presence;
CREATE POLICY tooth_presence_delete ON tooth_presence FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin', 'dentist'));

-- TOOTH_FINDINGS
DROP POLICY IF EXISTS tooth_findings_select ON tooth_findings;
CREATE POLICY tooth_findings_select ON tooth_findings FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));
DROP POLICY IF EXISTS tooth_findings_insert ON tooth_findings;
CREATE POLICY tooth_findings_insert ON tooth_findings FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'dentist'));
DROP POLICY IF EXISTS tooth_findings_update ON tooth_findings;
CREATE POLICY tooth_findings_update ON tooth_findings FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'dentist'))
  WITH CHECK (get_user_role() IN ('admin', 'dentist'));
DROP POLICY IF EXISTS tooth_findings_delete ON tooth_findings;
CREATE POLICY tooth_findings_delete ON tooth_findings FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin', 'dentist'));

-- FINDING_SURFACES
DROP POLICY IF EXISTS finding_surfaces_select ON finding_surfaces;
CREATE POLICY finding_surfaces_select ON finding_surfaces FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));
DROP POLICY IF EXISTS finding_surfaces_insert ON finding_surfaces;
CREATE POLICY finding_surfaces_insert ON finding_surfaces FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'dentist'));
DROP POLICY IF EXISTS finding_surfaces_delete ON finding_surfaces;
CREATE POLICY finding_surfaces_delete ON finding_surfaces FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin', 'dentist'));

-- DENTAL_CHART_HISTORY (INSERT only — immutable)
DROP POLICY IF EXISTS dental_chart_history_select ON dental_chart_history;
CREATE POLICY dental_chart_history_select ON dental_chart_history FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));
DROP POLICY IF EXISTS dental_chart_history_insert ON dental_chart_history;
CREATE POLICY dental_chart_history_insert ON dental_chart_history FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'dentist'));

-- DENTAL_CHART_SNAPSHOTS
DROP POLICY IF EXISTS dental_chart_snapshots_select ON dental_chart_snapshots;
CREATE POLICY dental_chart_snapshots_select ON dental_chart_snapshots FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));
DROP POLICY IF EXISTS dental_chart_snapshots_insert ON dental_chart_snapshots;
CREATE POLICY dental_chart_snapshots_insert ON dental_chart_snapshots FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'dentist'));
DROP POLICY IF EXISTS dental_chart_snapshots_delete ON dental_chart_snapshots;
CREATE POLICY dental_chart_snapshots_delete ON dental_chart_snapshots FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

-- WAITLIST_ENTRIES (reception + admin)
DROP POLICY IF EXISTS waitlist_entries_select ON waitlist_entries;
CREATE POLICY waitlist_entries_select ON waitlist_entries FOR SELECT TO authenticated
  USING (get_user_role() IN ('reception', 'admin'));
DROP POLICY IF EXISTS waitlist_entries_insert ON waitlist_entries;
CREATE POLICY waitlist_entries_insert ON waitlist_entries FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('reception', 'admin'));
DROP POLICY IF EXISTS waitlist_entries_update ON waitlist_entries;
CREATE POLICY waitlist_entries_update ON waitlist_entries FOR UPDATE TO authenticated
  USING (get_user_role() IN ('reception', 'admin'))
  WITH CHECK (get_user_role() IN ('reception', 'admin'));
DROP POLICY IF EXISTS waitlist_entries_delete ON waitlist_entries;
CREATE POLICY waitlist_entries_delete ON waitlist_entries FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

-- AUDIT_LOGS (admin read only, service role INSERT via triggers)
DROP POLICY IF EXISTS audit_logs_select ON audit_logs;
CREATE POLICY audit_logs_select ON audit_logs FOR SELECT TO authenticated USING (get_user_role() = 'admin');

-- BOOKING_SESSIONS (service role only — used by webhook/cron)
DROP POLICY IF EXISTS booking_sessions_service_role_all ON booking_sessions;
CREATE POLICY booking_sessions_service_role_all ON booking_sessions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- MESSENGER_CONVERSATIONS (reception + admin)
DROP POLICY IF EXISTS messenger_conversations_select ON messenger_conversations;
CREATE POLICY messenger_conversations_select ON messenger_conversations FOR SELECT TO authenticated
  USING (get_user_role() IN ('reception', 'admin'));
DROP POLICY IF EXISTS messenger_conversations_insert ON messenger_conversations;
CREATE POLICY messenger_conversations_insert ON messenger_conversations FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('reception', 'admin'));
DROP POLICY IF EXISTS messenger_conversations_update ON messenger_conversations;
CREATE POLICY messenger_conversations_update ON messenger_conversations FOR UPDATE TO authenticated
  USING (get_user_role() IN ('reception', 'admin'))
  WITH CHECK (get_user_role() IN ('reception', 'admin'));

-- MESSENGER_MESSAGES (INSERT only — immutable; UPDATE for is_read)
DROP POLICY IF EXISTS messenger_messages_select ON messenger_messages;
CREATE POLICY messenger_messages_select ON messenger_messages FOR SELECT TO authenticated
  USING (get_user_role() IN ('reception', 'admin'));
DROP POLICY IF EXISTS messenger_messages_insert ON messenger_messages;
CREATE POLICY messenger_messages_insert ON messenger_messages FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('reception', 'admin'));
DROP POLICY IF EXISTS messenger_messages_update_is_read ON messenger_messages;
CREATE POLICY messenger_messages_update_is_read ON messenger_messages FOR UPDATE TO authenticated
  USING (get_user_role() IN ('reception', 'admin'))
  WITH CHECK (get_user_role() IN ('reception', 'admin'));

-- REASSIGNMENT_LOGS (INSERT only — immutable)
DROP POLICY IF EXISTS reassignment_logs_select ON reassignment_logs;
CREATE POLICY reassignment_logs_select ON reassignment_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS reassignment_logs_insert ON reassignment_logs;
CREATE POLICY reassignment_logs_insert ON reassignment_logs FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('reception', 'admin'));

-- ============================================================
-- 8. LOOKUP DATA (from migrations — not test seed data)
-- ============================================================

-- Medical conditions (Q13 checklist)
INSERT INTO medical_conditions (name) VALUES
  ('High Blood Pressure'), ('Low Blood Pressure'), ('Epilepsy / Convulsions'),
  ('AIDS or HIV Infection'), ('Sexually Transmitted Disease'), ('Stomach Troubles / Ulcers'),
  ('Fainting Seizure'), ('Rapid Weight Loss'), ('Radiation Therapy'),
  ('Joint Replacement / Implant'), ('Heart Surgery'), ('Heart Attack'),
  ('Thyroid Problem'), ('Heart Disease'), ('Heart Murmur'),
  ('Hepatitis / Liver Disease'), ('Rheumatic Fever'), ('Hay Fever / Allergies'),
  ('Respiratory Problems'), ('Hepatitis / Jaundice'), ('Tuberculosis'),
  ('Swollen Ankles'), ('Kidney Disease'), ('Diabetes'),
  ('Chest Pain'), ('Stroke'), ('Cancer / Tumors'),
  ('Anemia'), ('Angina'), ('Asthma'),
  ('Emphysema'), ('Bleeding Problems'), ('Blood Diseases'),
  ('Head Injuries'), ('Arthritis / Rheumatism'), ('Other')
ON CONFLICT (name) DO NOTHING;

-- Consent clauses (PDA informed consent)
INSERT INTO consent_clauses (clause_key, title, body_text, sort_order) VALUES
('treatment_to_be_done', 'Treatment to be Done',
 'I understand and consent to have any treatment done by the dentist after the procedure, the risks & benefits & cost have been fully explained. These treatments include, but are not limited to, x-rays, cleanings, periodontal treatments, fillings, crowns, bridges, all types of extraction, root canals, &/or dentures, local anesthetics & surgical cases.', 1),
('drugs_and_medications', 'Drugs & Medications',
 'I understand that antibiotics, analgesics & other medications can cause allergic reactions like redness & swelling of tissues, pain, itching, vomiting, &/or anaphylactic shock.', 2),
('changes_in_treatment_plan', 'Changes in Treatment Plan',
 'I understand that during treatment it may be necessary to change/add procedures because of conditions found while working on the teeth that was not discovered during examination. For example, root canal therapy may be needed following routine restorative procedures. I give my permission to the dentist to make any/all changes and additions as necessary w/ my responsibility to pay all the costs agreed.', 3),
('radiograph', 'Radiograph',
 'I understand that an x-ray shot or a radiograph maybe necessary as part of diagnostic aid to come up with tentative diagnosis of my dental problem and to make a good treatment plan, but this will not give me a 100% assurance for the accuracy of the treatment since all dental treatments are subject to unpredictable complications that later on may lead to sudden change of treatment plan and subject to new charges.', 4),
('removal_of_teeth', 'Removal of Teeth',
 'I understand that alternatives to tooth removal (root canal therapy, crowns & periodontal surgery, etc.) & I completely understand these alternatives, including their risk & benefits prior to authorizing the dentist to remove teeth & any other structures necessary for reasons above. I understand that removing teeth does not always remove all the infection, if present, & it may be necessary to have further treatment. I understand the risk involved in having teeth removed, such as pain, swelling, spread of infection, dry socket, fractured jaw, loss of feeling on the teeth, lips, tongue & surrounding tissue that can last for an indefinite period of time. I understand that I may need further treatment under a specialist if complications arise during or following treatment.', 5),
('crowns_and_bridges', 'Crowns (Caps) & Bridges',
 'Preparing a tooth may irritate the nerve tissue in the center of the tooth, leaving the tooth extra sensitive to heat, cold & pressure. Treating such irritation may involve using special toothpastes, mouth rinses or root canal therapy. I understand that sometimes it is not possible to match the color of natural teeth exactly with artificial teeth. I further understand that I may be wearing temporary crowns, which may come off easily & that I must be careful to ensure that they are kept on until the permanent crowns are cemented. It is my responsibility to return for permanent cementation within 20 days from tooth preparation, as excessive days delay may allow for tooth movement, which may necessitate a remake of the crown, bridge/cap. I understand there will be additional charges for remakes due to my delaying of permanent cementation, & I realize that final opportunity to make changes in my new crown, bridge or cap (including shape, fit, size & color) will be before permanent cementation.', 6),
('endodontics_root_canal', 'Endodontics (Root Canal)',
 'I understand there is no guarantee that a root canal treatment will save a tooth & that complications can occur from the treatment & that occasionally root canal filling materials may extend through the tooth which does not necessarily affect the success of the treatment. I understand that endodontic files & drills are very fine instruments & stresses vented in their manufacture & calcifications present in teeth can cause them to break during use. I understand that referral to the endodontist for additional treatments may be necessary following any root canal treatment & I agree that I am responsible for any additional cost for treatment performed by the endodontist. I understand that a tooth may require removal in spite of all efforts to save it.', 7),
('periodontal_disease', 'Periodontal Disease',
 'I understand that periodontal disease is a serious condition causing gum & bone inflammation &/or loss & that can lead eventually to the loss of my teeth. I understand the alternative treatment plans to correct periodontal disease, including gum surgery tooth extractions with or without replacement. I understand that undertaking any dental procedures may have future adverse effect on my periodontal conditions.', 8),
('fillings', 'Fillings',
 'I understand that care must be exercised in chewing on fillings, especially during the first 24 hours to avoid breakage. I understand that a more extensive filling or a crown may be required, as additional decay or fracture may become evident after initial excavation. I understand that significant sensitivity is common, but usually temporary, after-effect of a newly placed filling. I further understand that filling a tooth may irritate the nerve tissue creating sensitivity & treating such sensitivity could require root canal therapy or extractions.', 9),
('dentures', 'Dentures',
 'I understand that wearing of dentures can be difficult. Sore spots, altered speech & difficulty in eating are common problems. Immediate dentures (placement of denture immediately after extractions) may be painful. Immediate dentures may require considerable adjusting & several relines. I understand that it is my responsibility to return for delivery of dentures. I understand that failure to keep my delivery appointment may result in poorly fitted dentures. If a remake is required due to my delays of more than 30 days, there will be additional charges. A permanent reline will be needed later, which is not included in the initial fee. I understand that all adjustment or alterations of any kind after this initial period is subject to charges.', 10)
ON CONFLICT (clause_key) DO NOTHING;

-- ============================================================
-- 9. REALTIME — enable postgres_changes for live chat
-- Cloud Supabase does NOT enable Realtime per-table by default.
-- These tables must be added to the supabase_realtime publication
-- for the live chat (postgres_changes subscriptions) to work.
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE messenger_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messenger_messages;

-- ============================================================
-- END OF SCHEMA
-- ============================================================
