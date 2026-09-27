-- ============================================================
-- Fix: Allow 'dentist' role to access messenger_conversations
-- and messenger_messages in Live Chat (/chat).
-- Previously only 'reception' and 'admin' were permitted,
-- causing empty conversation lists and denied message queries
-- for attending dentists.
-- ============================================================

-- MESSENGER_CONVERSATIONS
DROP POLICY IF EXISTS messenger_conversations_select ON messenger_conversations;
CREATE POLICY messenger_conversations_select ON messenger_conversations FOR SELECT TO authenticated
  USING (get_user_role() IN ('reception', 'admin', 'dentist'));

DROP POLICY IF EXISTS messenger_conversations_insert ON messenger_conversations;
CREATE POLICY messenger_conversations_insert ON messenger_conversations FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('reception', 'admin', 'dentist'));

DROP POLICY IF EXISTS messenger_conversations_update ON messenger_conversations;
CREATE POLICY messenger_conversations_update ON messenger_conversations FOR UPDATE TO authenticated
  USING (get_user_role() IN ('reception', 'admin', 'dentist'))
  WITH CHECK (get_user_role() IN ('reception', 'admin', 'dentist'));

-- MESSENGER_MESSAGES
DROP POLICY IF EXISTS messenger_messages_select ON messenger_messages;
CREATE POLICY messenger_messages_select ON messenger_messages FOR SELECT TO authenticated
  USING (get_user_role() IN ('reception', 'admin', 'dentist'));

DROP POLICY IF EXISTS messenger_messages_insert ON messenger_messages;
CREATE POLICY messenger_messages_insert ON messenger_messages FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('reception', 'admin', 'dentist'));

DROP POLICY IF EXISTS messenger_messages_update_is_read ON messenger_messages;
CREATE POLICY messenger_messages_update_is_read ON messenger_messages FOR UPDATE TO authenticated
  USING (get_user_role() IN ('reception', 'admin', 'dentist'))
  WITH CHECK (get_user_role() IN ('reception', 'admin', 'dentist'));
