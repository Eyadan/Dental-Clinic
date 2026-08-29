-- Add is_read column to messenger_messages for unread tracking
-- Allows staff to see which inbound messages haven't been viewed yet

ALTER TABLE messenger_messages
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;

-- Only inbound messages can be unread; outbound messages are always "read"
UPDATE messenger_messages SET is_read = true WHERE direction = 'outbound';

-- Index for efficient unread count queries
CREATE INDEX IF NOT EXISTS idx_messenger_messages_unread
  ON messenger_messages (conversation_id, is_read)
  WHERE is_read = false;

-- Allow staff to update is_read (needed for mark-as-read)
CREATE POLICY messenger_messages_update_is_read ON messenger_messages
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('reception', 'admin'))
  WITH CHECK (get_user_role() IN ('reception', 'admin'));
