"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConversationList } from "./conversation-list";
import { ChatThread } from "./chat-thread";
import { PatientInfoPanel } from "./patient-info-panel";
import { getConversationsAction, markAsReadAction, type ConversationWithDetails } from "./actions";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import { PageHeroBanner } from "@/components/shared/page-hero-banner";

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
        () => loadConversations()
      )
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messenger_messages" },
        () => loadConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadConversations]);

  const handleSelect = async (conversation: ConversationWithDetails) => {
    setSelected(conversation);
    if (conversation.unread_count > 0) {
      await markAsReadAction(conversation.id);
      loadConversations();
    }
  };

  const unreadTotal = conversations.reduce((acc, c) => acc + c.unread_count, 0);

  return (
    <div className="space-y-4 h-[calc(100vh-100px)] flex flex-col pb-4">
      <PageHeroBanner
        icon={MessageSquare}
        title="Messenger Live Chat Handoff"
        description="Real-time Facebook Messenger AI chatbot takeover & patient support workspace"
        badgeText={unreadTotal > 0 ? `${unreadTotal} Unread` : undefined}
      />

      {/* 3-COLUMN CHAT INTERFACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden min-h-0">
        <div className="lg:col-span-4 h-full card-premium overflow-hidden">
          <ConversationList
            conversations={conversations}
            selectedId={selected?.id ?? null}
            onSelect={handleSelect}
          />
        </div>

        <div className="lg:col-span-5 h-full card-premium overflow-hidden flex flex-col">
          {selected ? (
            <ChatThread
              conversation={selected}
              staffId={staffId}
              onConversationChange={loadConversations}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-xs text-muted-foreground p-6 text-center">
              <MessageSquare className="h-8 w-8 mb-2 text-slate-400" />
              <p className="font-bold text-foreground">Select a conversation</p>
              <p className="text-[11px] mt-0.5 text-muted-foreground">Choose a patient from the list on the left to start live chat support.</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-3 h-full card-premium overflow-hidden">
          {selected ? (
            <PatientInfoPanel conversation={selected} />
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground p-4 text-center font-medium">
              Patient info preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
