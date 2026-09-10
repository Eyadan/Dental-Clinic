-- ============================================================
-- PAYMENT_RECEIPT_VERSIONS TABLE & RLS POLICIES (REQUEST & APPROVAL FLOW)
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

-- Enable Row Level Security
ALTER TABLE payment_receipt_versions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Staff can view receipt versions" ON payment_receipt_versions;
DROP POLICY IF EXISTS "Staff can insert receipt versions" ON payment_receipt_versions;
DROP POLICY IF EXISTS "Admin can update receipt versions" ON payment_receipt_versions;

-- Staff Read Policy (Admin, Reception, Dentist can view history & requests)
CREATE POLICY "Staff can view receipt versions"
  ON payment_receipt_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'reception', 'dentist')
    )
  );

-- Staff Insert Policy (Admin, Reception, Dentist can submit replacement requests)
CREATE POLICY "Staff can insert receipt versions"
  ON payment_receipt_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'reception', 'dentist')
    )
  );

-- Admin Update Policy (Only Admin can approve or reject replacement requests)
CREATE POLICY "Admin can update receipt versions"
  ON payment_receipt_versions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );
