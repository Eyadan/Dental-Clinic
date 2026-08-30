-- Fix: Allow dentists and reception staff to delete/remove leave blocks from dentist_blocks
DROP POLICY IF EXISTS dentist_blocks_delete ON dentist_blocks;

CREATE POLICY dentist_blocks_delete ON dentist_blocks
  FOR DELETE TO authenticated
  USING (
    dentist_id = get_current_dentist_id()
    OR get_user_role() IN ('admin', 'reception')
  );
