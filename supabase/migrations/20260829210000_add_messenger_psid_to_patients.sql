-- ============================================================
-- Add messenger_psid column to patients table
-- For linking Messenger users to patient records
-- ============================================================

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS messenger_psid TEXT;

CREATE INDEX IF NOT EXISTS idx_patients_messenger_psid
  ON patients (messenger_psid)
  WHERE messenger_psid IS NOT NULL;
