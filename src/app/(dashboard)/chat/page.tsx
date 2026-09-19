import { getServerUserContext } from "@/lib/supabase/user-context";
import { ChatClient } from "./chat-client";

export default async function ChatPage() {
  const { userId } = await getServerUserContext();
  const staffId = userId ?? "";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Live Chat</h1>
        <p className="text-sm text-muted-foreground">
          Take over Messenger conversations from the bot and respond to patients in real-time
        </p>
      </div>

      <ChatClient staffId={staffId} />
    </div>
  );
}
