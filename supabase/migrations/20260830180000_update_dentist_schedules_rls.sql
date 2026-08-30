-- Fix: Allow reception staff and dentists to manage dentist_schedules
DROP POLICY IF EXISTS dentist_schedules_insert ON dentist_schedules;
DROP POLICY IF EXISTS dentist_schedules_update ON dentist_schedules;
DROP POLICY IF EXISTS dentist_schedules_delete ON dentist_schedules;

CREATE POLICY dentist_schedules_insert ON dentist_schedules
  FOR INSERT TO authenticated
  WITH CHECK (
    dentist_id = get_current_dentist_id() OR get_user_role() IN ('admin', 'reception')
  );

CREATE POLICY dentist_schedules_update ON dentist_schedules
  FOR UPDATE TO authenticated
  USING (
    dentist_id = get_current_dentist_id() OR get_user_role() IN ('admin', 'reception')
  )
  WITH CHECK (
    dentist_id = get_current_dentist_id() OR get_user_role() IN ('admin', 'reception')
  );

CREATE POLICY dentist_schedules_delete ON dentist_schedules
  FOR DELETE TO authenticated
  USING (
    dentist_id = get_current_dentist_id() OR get_user_role() IN ('admin', 'reception')
  );
