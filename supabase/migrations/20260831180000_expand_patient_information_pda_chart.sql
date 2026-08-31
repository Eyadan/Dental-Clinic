-- ============================================================
-- Expand patient information to match PDA (Philippine Dental
-- Association) Dental Chart — Patient Information Record,
-- Dental History, and Medical History sections.
-- 3NF-compliant: medical conditions normalised into lookup +
-- junction table instead of repeated columns/arrays.
-- ============================================================

-- ============================================================
-- PATIENTS TABLE — Patient Information Record fields
-- ============================================================

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS middle_name TEXT,
  ADD COLUMN IF NOT EXISTS sex TEXT CHECK (sex IN ('M', 'F')),
  ADD COLUMN IF NOT EXISTS nickname TEXT,
  ADD COLUMN IF NOT EXISTS religion TEXT,
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS home_address TEXT,
  ADD COLUMN IF NOT EXISTS home_no TEXT,
  ADD COLUMN IF NOT EXISTS office_no TEXT,
  ADD COLUMN IF NOT EXISTS fax_no TEXT,
  ADD COLUMN IF NOT EXISTS occupation TEXT,
  ADD COLUMN IF NOT EXISTS dental_insurance TEXT,
  ADD COLUMN IF NOT EXISTS insurance_effective_date DATE,
  ADD COLUMN IF NOT EXISTS guardian_name TEXT,
  ADD COLUMN IF NOT EXISTS guardian_occupation TEXT,
  ADD COLUMN IF NOT EXISTS referred_by TEXT,
  ADD COLUMN IF NOT EXISTS consultation_reason TEXT;

-- ============================================================
-- PATIENT_MEDICAL_RECORDS TABLE (1:1 with patients)
-- Dental History + Medical History sections
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

CREATE INDEX IF NOT EXISTS idx_patient_medical_records_patient ON patient_medical_records (patient_id);

CREATE TRIGGER trg_patient_medical_records_updated_at
  BEFORE UPDATE ON patient_medical_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- MEDICAL_CONDITIONS TABLE (lookup — Q13 checklist)
-- ============================================================

CREATE TABLE IF NOT EXISTS medical_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

-- ============================================================
-- PATIENT_MEDICAL_CONDITIONS TABLE (M:N junction)
-- ============================================================

CREATE TABLE IF NOT EXISTS patient_medical_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  condition_id UUID NOT NULL REFERENCES medical_conditions(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_patient_condition UNIQUE (patient_id, condition_id)
);

CREATE INDEX IF NOT EXISTS idx_patient_medical_conditions_patient ON patient_medical_conditions (patient_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE patient_medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_medical_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY patient_medical_records_select ON patient_medical_records
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));

CREATE POLICY patient_medical_records_insert ON patient_medical_records
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'reception', 'dentist'));

CREATE POLICY patient_medical_records_update ON patient_medical_records
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));

CREATE POLICY medical_conditions_select ON medical_conditions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY patient_medical_conditions_select ON patient_medical_conditions
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));

CREATE POLICY patient_medical_conditions_insert ON patient_medical_conditions
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'reception', 'dentist'));

CREATE POLICY patient_medical_conditions_delete ON patient_medical_conditions
  FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));
