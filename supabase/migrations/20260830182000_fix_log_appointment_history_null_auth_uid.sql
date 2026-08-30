-- Fix: Handle NULL auth.uid() in log_appointment_history() trigger
-- When updates to appointments occur via service role or background actions, auth.uid() is NULL.
-- Fallback to an admin user ID to prevent violating the NOT NULL constraint on appointment_history.changed_by.

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
    -- Fallback to any valid user ID if no admin exists
    SELECT id INTO v_changed_by FROM users LIMIT 1;
  END IF;

  -- Log booking_status changes
  IF NEW.booking_status IS DISTINCT FROM OLD.booking_status THEN
    INSERT INTO appointment_history (appointment_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'booking_status', OLD.booking_status::TEXT, NEW.booking_status::TEXT);
  END IF;

  -- Log visit_status changes
  IF NEW.visit_status IS DISTINCT FROM OLD.visit_status THEN
    INSERT INTO appointment_history (appointment_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'visit_status', OLD.visit_status::TEXT, NEW.visit_status::TEXT);
  END IF;

  -- Log payment_status changes
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    INSERT INTO appointment_history (appointment_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'payment_status', OLD.payment_status::TEXT, NEW.payment_status::TEXT);
  END IF;

  -- Log scheduled_date changes
  IF NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date THEN
    INSERT INTO appointment_history (appointment_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'scheduled_date', OLD.scheduled_date::TEXT, NEW.scheduled_date::TEXT);
  END IF;

  -- Log scheduled_time changes
  IF NEW.scheduled_time IS DISTINCT FROM OLD.scheduled_time THEN
    INSERT INTO appointment_history (appointment_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'scheduled_time', OLD.scheduled_time::TEXT, NEW.scheduled_time::TEXT);
  END IF;

  -- Log dentist_id changes
  IF NEW.dentist_id IS DISTINCT FROM OLD.dentist_id THEN
    INSERT INTO appointment_history (appointment_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'dentist_id', OLD.dentist_id::TEXT, NEW.dentist_id::TEXT);
  END IF;

  RETURN NEW;
END;
$$;
