-- ============================================================
-- Fix: validate_appointment_status() trigger references
-- 'no_show' as a visit_status value, but no_show is a
-- booking_status enum value — not a visit_status.
-- This causes "invalid input value for enum visit_status: no_show"
-- which crashes every visit_status-only UPDATE (call, delay).
--
-- The correct transition from 'delayed' is just 'waiting'
-- (patient called after being delayed). No-show is handled
-- by setting visit_status = NULL, which skips the transition
-- check entirely.
-- ============================================================

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
      (OLD.booking_status = 'rescheduled' AND NEW.booking_status IN ('confirmed', 'pending_cancellation', 'cancelled', 'no_show', 'completed')) OR
      (OLD.booking_status = 'pending_cancellation' AND NEW.booking_status IN ('cancelled'))
    ) THEN
      RAISE EXCEPTION 'Invalid booking_status transition: % -> %', OLD.booking_status, NEW.booking_status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Visit status must be null when booking is in a non-active state
  IF NEW.booking_status IN ('cancelled', 'no_show', 'pending', 'declined', 'expired') AND NEW.visit_status IS NOT NULL THEN
    RAISE EXCEPTION 'visit_status must be null when booking_status is %', NEW.booking_status
      USING ERRCODE = 'check_violation';
  END IF;

  -- Validate visit_status transitions if changing
  IF NEW.visit_status IS DISTINCT FROM OLD.visit_status THEN
    IF OLD.visit_status IS NULL AND NEW.visit_status IS NOT NULL AND NEW.visit_status != 'checked_in' THEN
      RAISE EXCEPTION 'First visit_status must be checked_in, got %', NEW.visit_status
        USING ERRCODE = 'check_violation';
    END IF;

    IF OLD.visit_status IS NOT NULL AND NEW.visit_status IS NOT NULL THEN
      IF NOT (
        (OLD.visit_status = 'checked_in' AND NEW.visit_status IN ('waiting', 'delayed')) OR
        (OLD.visit_status = 'waiting' AND NEW.visit_status IN ('in_consultation', 'delayed')) OR
        (OLD.visit_status = 'delayed' AND NEW.visit_status IN ('waiting')) OR
        (OLD.visit_status = 'in_consultation' AND NEW.visit_status IN ('consent_signed')) OR
        (OLD.visit_status = 'consent_signed' AND NEW.visit_status IN ('treatment_ongoing')) OR
        (OLD.visit_status = 'treatment_ongoing' AND NEW.visit_status IN ('treatment_paused', 'checkout')) OR
        (OLD.visit_status = 'treatment_paused' AND NEW.visit_status IN ('awaiting_requirement')) OR
        (OLD.visit_status = 'awaiting_requirement' AND NEW.visit_status IN ('resumed')) OR
        (OLD.visit_status = 'resumed' AND NEW.visit_status IN ('treatment_ongoing')) OR
        (OLD.visit_status = 'checkout' AND NEW.visit_status IN ('completed'))
      ) THEN
        RAISE EXCEPTION 'Invalid visit_status transition: % -> %', OLD.visit_status, NEW.visit_status
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
