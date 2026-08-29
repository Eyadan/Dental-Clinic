-- ============================================================
-- Fix: get_user_role() must return the application role
-- (admin/reception/dentist) from public.users, not the GoTrue
-- default JWT 'role' claim which is always 'authenticated'.
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;
