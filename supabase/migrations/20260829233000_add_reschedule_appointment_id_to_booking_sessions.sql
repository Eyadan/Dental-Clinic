-- Add column to store the appointment ID being rescheduled
ALTER TABLE booking_sessions
  ADD COLUMN IF NOT EXISTS reschedule_appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;
