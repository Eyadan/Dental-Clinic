-- ============================================================
-- Enable Realtime publication & Replica Identity for Live Chat
-- This ensures postgres_changes subscriptions receive broadcasts
-- for new messages and updated conversation states.
-- ============================================================

DO $$
BEGIN
  -- Add messenger_conversations if not already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messenger_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messenger_conversations;
  END IF;

  -- Add messenger_messages if not already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messenger_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messenger_messages;
  END IF;
END $$;

-- Set REPLICA IDENTITY FULL so column filters (e.g. conversation_id=eq.X) work properly in Realtime
ALTER TABLE messenger_conversations REPLICA IDENTITY FULL;
ALTER TABLE messenger_messages REPLICA IDENTITY FULL;
