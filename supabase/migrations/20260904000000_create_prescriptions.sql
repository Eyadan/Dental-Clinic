-- ============================================================
-- PRESCRIPTIONS & PRESCRIPTION_ITEMS TABLES & RLS POLICIES
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

-- Enable Row Level Security
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Staff can view prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Staff can insert prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Staff can delete prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Staff can view prescription items" ON prescription_items;
DROP POLICY IF EXISTS "Staff can insert prescription items" ON prescription_items;
DROP POLICY IF EXISTS "Staff can delete prescription items" ON prescription_items;

-- Prescriptions Policies
CREATE POLICY "Staff can view prescriptions"
  ON prescriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'reception', 'dentist')
    )
  );

CREATE POLICY "Staff can insert prescriptions"
  ON prescriptions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'reception', 'dentist')
    )
  );

CREATE POLICY "Staff can delete prescriptions"
  ON prescriptions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'reception', 'dentist')
    )
  );

-- Prescription Items Policies
CREATE POLICY "Staff can view prescription items"
  ON prescription_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'reception', 'dentist')
    )
  );

CREATE POLICY "Staff can insert prescription items"
  ON prescription_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'reception', 'dentist')
    )
  );

CREATE POLICY "Staff can delete prescription items"
  ON prescription_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'reception', 'dentist')
    )
  );
