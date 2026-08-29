-- ============================================================
-- Database Triggers
-- Per ARCHITECTURE §4.3
-- 1. appointment_status_validate — validates status transitions
-- 2. appointment_history_log — records field changes
-- 3. qr_code_invalidate — sets is_used + used_at on first use
-- 4. payment_status_update — recalculates invoice payment status
-- ============================================================

-- ============================================================
-- 1. APPOINTMENT_STATUS_VALIDATE (BEFORE UPDATE)
-- Validates booking_status and visit_status transitions
-- ============================================================

CREATE OR REPLACE FUNCTION validate_appointment_status()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_appointment_status_validate
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION validate_appointment_status();

-- ============================================================
-- 2. APPOINTMENT_HISTORY_LOG (AFTER UPDATE)
-- Records changed fields to appointment_history table
-- ============================================================

CREATE OR REPLACE FUNCTION log_appointment_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_by_uuid UUID := auth.uid();
BEGIN
  -- Use a sentinel UUID when no authenticated user (service role updates)
  IF changed_by_uuid IS NULL THEN
    changed_by_uuid := '00000000-0000-0000-0000-000000000000';
  END IF;

  -- Log booking_status changes
  IF NEW.booking_status IS DISTINCT FROM OLD.booking_status THEN
    INSERT INTO appointment_history (appointment_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'booking_status', OLD.booking_status::TEXT, NEW.booking_status::TEXT);
  END IF;

  -- Log visit_status changes
  IF NEW.visit_status IS DISTINCT FROM OLD.visit_status THEN
    INSERT INTO appointment_history (appointment_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'visit_status', OLD.visit_status::TEXT, NEW.visit_status::TEXT);
  END IF;

  -- Log payment_status changes
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    INSERT INTO appointment_history (appointment_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'payment_status', OLD.payment_status::TEXT, NEW.payment_status::TEXT);
  END IF;

  -- Log scheduled_date changes
  IF NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date THEN
    INSERT INTO appointment_history (appointment_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'scheduled_date', OLD.scheduled_date::TEXT, NEW.scheduled_date::TEXT);
  END IF;

  -- Log scheduled_time changes
  IF NEW.scheduled_time IS DISTINCT FROM OLD.scheduled_time THEN
    INSERT INTO appointment_history (appointment_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'scheduled_time', OLD.scheduled_time::TEXT, NEW.scheduled_time::TEXT);
  END IF;

  -- Log dentist_id changes
  IF NEW.dentist_id IS DISTINCT FROM OLD.dentist_id THEN
    INSERT INTO appointment_history (appointment_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'dentist_id', OLD.dentist_id::TEXT, NEW.dentist_id::TEXT);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_appointment_history_log
  AFTER UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION log_appointment_history();

-- ============================================================
-- 3. QR_CODE_INVALIDATE (AFTER UPDATE)
-- Ensures is_used is set atomically and used_at is populated
-- ============================================================

CREATE OR REPLACE FUNCTION invalidate_qr_code()
RETURNS TRIGGER AS $$
BEGIN
  -- When is_used transitions from false to true, set used_at if not already set
  IF NEW.is_used = true AND OLD.is_used = false AND NEW.used_at IS NULL THEN
    NEW.used_at = now();
  END IF;

  -- Prevent re-use: once used, cannot be un-used
  IF OLD.is_used = true AND NEW.is_used = false THEN
    RAISE EXCEPTION 'QR code already used — cannot reset is_used'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- This needs to be BEFORE UPDATE to set used_at
CREATE TRIGGER trg_qr_code_invalidate
  BEFORE UPDATE ON qr_codes
  FOR EACH ROW EXECUTE FUNCTION invalidate_qr_code();

-- ============================================================
-- 4. PAYMENT_STATUS_UPDATE (AFTER INSERT/UPDATE on payments)
-- Recalculates invoice payment_status based on sum of payments
-- ============================================================

CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_total NUMERIC(12, 2);
  v_paid NUMERIC(12, 2);
  v_new_status payment_status;
BEGIN
  -- Get the invoice_id (from INSERT or UPDATE)
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  -- Get invoice total
  SELECT total_amount INTO v_total FROM invoices WHERE id = v_invoice_id;

  -- Sum all payments for this invoice
  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM payments WHERE invoice_id = v_invoice_id;

  -- Determine new payment status
  IF v_paid >= v_total AND v_total > 0 THEN
    v_new_status := 'paid';
  ELSIF v_paid > 0 AND v_paid < v_total THEN
    v_new_status := 'partially_paid';
  ELSE
    v_new_status := 'pending_payment';
  END IF;

  -- Update invoice payment_status (bypasses RLS via SECURITY DEFINER)
  UPDATE invoices SET payment_status = v_new_status WHERE id = v_invoice_id;

  -- Also sync the appointment's payment_status
  UPDATE appointments SET payment_status = v_new_status
  WHERE id = (SELECT appointment_id FROM invoices WHERE id = v_invoice_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_payment_status_update_insert
  AFTER INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION update_invoice_payment_status();

CREATE TRIGGER trg_payment_status_update_update
  AFTER UPDATE OF amount, invoice_id ON payments
  FOR EACH ROW EXECUTE FUNCTION update_invoice_payment_status();

-- ============================================================
-- 5. REFERENCE_NO AUTO-GENERATION (BEFORE INSERT on appointments)
-- Generates a unique reference number if not provided
-- ============================================================

CREATE OR REPLACE FUNCTION generate_reference_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_no IS NULL OR NEW.reference_no = '' THEN
    NEW.reference_no := 'REF-' || to_char(now(), 'YYYYMMDD') || '-' || substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_appointment_reference_no
  BEFORE INSERT ON appointments
  FOR EACH ROW EXECUTE FUNCTION generate_reference_no();
