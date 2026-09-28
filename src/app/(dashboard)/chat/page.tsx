import { getServerUserContext } from "@/lib/supabase/user-context";
import { ChatClient } from "./chat-client";
import { getConversationsAction } from "./actions";

export default async function ChatPage() {
  const { userId } = await getServerUserContext();
  const staffId = userId ?? "";
  const initialRes = await getConversationsAction();
  const initialConversations = initialRes.success && initialRes.data ? initialRes.data : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Live Chat</h1>
        <p className="text-sm text-muted-foreground">
          Take over Messenger conversations from the bot and respond to patients in real-time
        </p>
      </div>

      <ChatClient staffId={staffId} initialConversations={initialConversations} />
    </div>
  );
}
