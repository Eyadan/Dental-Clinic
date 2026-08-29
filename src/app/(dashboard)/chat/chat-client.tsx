"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare } from "lucide-react";
import { ConversationList } from "./conversation-list";
import { ChatThread } from "./chat-thread";
import { PatientInfoPanel } from "./patient-info-panel";
import { getConversationsAction, markAsReadAction, type ConversationWithDetails } from "./actions";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";

interface ChatClientProps {
  staffId: string;
}

export function ChatClient({ staffId }: ChatClientProps) {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [selected, setSelected] = useState<ConversationWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    const result = await getConversationsAction();
    if (result.success && result.data) {
      setConversations(result.data);
      setSelected((prev) => {
        if (!prev) return prev;
        const updated = result.data?.find((c) => c.id === prev.id);
        return updated ?? prev;
      });
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadConversations();

    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel("conversations-realtime")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "messenger_conversations" },
        () => loadConversations(),
      )
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messenger_messages" },
        () => loadConversations(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadConversations]);

  const handleSelect = useCallback(async (conv: ConversationWithDetails) => {
    setSelected(conv);
    if (conv.unread_count > 0) {
      await markAsReadAction(conv.id);
      await loadConversations();
    }
  }, [loadConversations]);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="h-6 w-6 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  return (
    <div className="grid h-[calc(100vh-8rem)] grid-cols-1 gap-0 lg:grid-cols-[280px_1fr_300px]">
      <div className="border-r border-border">
        <ConversationList
          conversations={conversations}
          selectedId={selected?.id ?? null}
          onSelect={handleSelect}
        />
      </div>

      <div className="h-full overflow-hidden border-r border-border">
        {selected ? (
          <ChatThread conversation={selected} staffId={staffId} onConversationChange={loadConversations} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-sm font-medium text-muted-foreground">
              Select a conversation to start
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Choose a conversation from the list to view messages
            </p>
          </div>
        )}
      </div>

      <div className="hidden lg:block">
        {selected ? (
          <PatientInfoPanel conversation={selected} />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <p className="text-xs text-muted-foreground">No conversation selected</p>
          </div>
        )}
      </div>
    </div>
  );
}
