-- Allow rescheduled -> approved transition so staff can re-approve rescheduled appointments
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
      (OLD.visit_status = 'checked_in' AND NEW.visit_status IN ('waiting', 'delayed')) OR
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
