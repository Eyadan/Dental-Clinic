-- Allow staff to dismiss temporary messenger notification failure alerts
-- while preserving strict immutability for all clinical, user, and security audit logs.
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.action = 'messenger_notification_failed' THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION 'audit_logs is immutable — modification not allowed' USING ERRCODE = 'raise_exception';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
