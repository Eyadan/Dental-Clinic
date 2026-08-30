"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-4 h-[calc(100vh-100px)] flex flex-col">
      {/* BRANDED HERO HEADER */}
      <div className="flex items-center justify-between bg-card p-4 rounded-2xl border border-border/60 shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white shadow-md shadow-cyan-500/20">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-foreground">Messenger Live Chat Handoff</h1>
              {unreadTotal > 0 && (
                <Badge className="bg-cyan-600 text-white text-[10px] rounded-full">
                  {unreadTotal} unread
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">Real-time Facebook Messenger chatbot takeover & patient support desk</p>
          </div>
        </div>
      </div>

      {/* 3-COLUMN CHAT INTERFACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden min-h-0">
        <div className="lg:col-span-4 h-full border border-border/60 bg-card rounded-2xl shadow-xs overflow-hidden">
          <ConversationList
            conversations={conversations}
            selectedId={selected?.id ?? null}
            onSelect={handleSelect}
          />
        </div>

        <div className="lg:col-span-5 h-full border border-border/60 bg-card rounded-2xl shadow-xs overflow-hidden flex flex-col">
          {selected ? (
            <ChatThread
              conversation={selected}
              staffId={staffId}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-xs text-muted-foreground p-6 text-center">
              <MessageSquare className="h-8 w-8 mb-2 text-muted-foreground/40" />
              <p className="font-semibold">Select a conversation</p>
              <p className="text-[11px] mt-0.5">Choose a patient from the list on the left to start live chat.</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-3 h-full border border-border/60 bg-card rounded-2xl shadow-xs overflow-hidden">
          {selected ? (
            <PatientInfoPanel conversation={selected} />
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground p-4 text-center">
              Patient details preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
