-- ============================================================
-- Update users SELECT policy: allow all authenticated staff to read user records
-- Reason: Receptionists and dentists need to see staff/dentist names
-- for appointment scheduling, queue management, audit logs, etc.
-- The previous policy only allowed reading own record or admin reading all,
-- which broke Supabase joins (e.g. dentists -> users) for non-admin roles.
-- ============================================================

DROP POLICY IF EXISTS users_select ON users;

CREATE POLICY users_select ON users
  FOR SELECT TO authenticated
  USING (true);
