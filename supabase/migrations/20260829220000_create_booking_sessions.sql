-- Booking sessions for Messenger booking conversation state
-- Replaces in-memory Map with persistent DB storage

CREATE TABLE IF NOT EXISTS booking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_psid TEXT NOT NULL UNIQUE,
  conversation_id UUID NOT NULL REFERENCES messenger_conversations(id) ON DELETE CASCADE,
  step TEXT NOT NULL DEFAULT 'awaiting_date',
  collected_date DATE,
  collected_time TIME WITHOUT TIME ZONE,
  collected_service_ids TEXT[],
  collected_dentist_id UUID REFERENCES dentists(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_sessions_psid
  ON booking_sessions (patient_psid);

CREATE INDEX IF NOT EXISTS idx_booking_sessions_step
  ON booking_sessions (step);

-- Auto-expire stale sessions after 30 minutes
CREATE INDEX IF NOT EXISTS idx_booking_sessions_created_at
  ON booking_sessions (created_at);

-- Updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_booking_sessions_updated_at') THEN
    CREATE TRIGGER trg_booking_sessions_updated_at
      BEFORE UPDATE ON booking_sessions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- RLS policies
ALTER TABLE booking_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_sessions_service_role_all"
  ON booking_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
