-- ============================================================
-- Fix: log_appointment_history() trigger must run as SECURITY
-- DEFINER so it can insert audit rows into appointment_history
-- regardless of the current user's RLS permissions.
--
-- Without this, approving/declining an appointment fails with:
--   "new row violates row-level security policy for table
--    appointment_history"
-- because the table only has a SELECT RLS policy and the
-- authenticated session has no INSERT permission.
-- ============================================================

CREATE OR REPLACE FUNCTION log_appointment_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log booking_status changes
  IF NEW.booking_status IS DISTINCT FROM OLD.booking_status THEN
    INSERT INTO appointment_history (appointment_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'booking_status', OLD.booking_status::TEXT, NEW.booking_status::TEXT);
  END IF;

  -- Log visit_status changes
  IF NEW.visit_status IS DISTINCT FROM OLD.visit_status THEN
    INSERT INTO appointment_history (appointment_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'visit_status', OLD.visit_status::TEXT, NEW.visit_status::TEXT);
  END IF;

  -- Log payment_status changes
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    INSERT INTO appointment_history (appointment_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'payment_status', OLD.payment_status::TEXT, NEW.payment_status::TEXT);
  END IF;

  -- Log scheduled_date changes
  IF NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date THEN
    INSERT INTO appointment_history (appointment_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'scheduled_date', OLD.scheduled_date::TEXT, NEW.scheduled_date::TEXT);
  END IF;

  -- Log scheduled_time changes
  IF NEW.scheduled_time IS DISTINCT FROM OLD.scheduled_time THEN
    INSERT INTO appointment_history (appointment_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'scheduled_time', OLD.scheduled_time::TEXT, NEW.scheduled_time::TEXT);
  END IF;

  -- Log dentist_id changes
  IF NEW.dentist_id IS DISTINCT FROM OLD.dentist_id THEN
    INSERT INTO appointment_history (appointment_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'dentist_id', OLD.dentist_id::TEXT, NEW.dentist_id::TEXT);
  END IF;

  RETURN NEW;
END;
$$;
