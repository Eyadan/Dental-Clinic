import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { ChatClient } from "./chat-client";

export default async function ChatPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const staffId = user?.id ?? "";

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
