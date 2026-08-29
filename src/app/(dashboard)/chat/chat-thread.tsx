"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, UserCheck, UserX, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { MessengerMessage } from "@/lib/types/database";
import type { ConversationWithDetails } from "./actions";
import { getMessagesAction, takeChatAction, endChatAction, sendMessageAction } from "./actions";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";

interface ChatThreadProps {
  conversation: ConversationWithDetails;
  staffId: string;
  onConversationChange?: () => void;
}

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
}

export function ChatThread({ conversation, staffId, onConversationChange }: ChatThreadProps) {
  const [messages, setMessages] = useState<MessengerMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    const result = await getMessagesAction(conversation.id);
    if (result.success && result.data) {
      setMessages(result.data);
    } else {
      setError(result.error ?? "Failed to load messages");
    }
    setIsLoading(false);
  }, [conversation.id]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel(`messages-${conversation.id}`)
      .on("postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messenger_messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        () => loadMessages(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id, loadMessages]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    setIsSending(true);
    setError(null);

    const result = await sendMessageAction(conversation.id, conversation.patient_psid, input);
    if (result.success) {
      setInput("");
      await loadMessages();
    } else {
      setError(result.error ?? "Failed to send message");
    }

    setIsSending(false);
  };

  const handleTakeChat = async () => {
    setIsToggling(true);
    const result = await takeChatAction(conversation.id, staffId);
    if (!result.success) {
      setError(result.error ?? "Failed to take over chat");
    } else {
      onConversationChange?.();
    }
    setIsToggling(false);
  };

  const handleEndChat = async () => {
    setIsToggling(true);
    const result = await endChatAction(conversation.id);
    if (!result.success) {
      setError(result.error ?? "Failed to end chat");
    } else {
      onConversationChange?.();
    }
    setIsToggling(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isTakenOver = conversation.status === "taken_over";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {conversation.patient_name ?? `PSID: ${conversation.patient_psid.slice(-6)}`}
          </p>
          <p className="text-xs text-text-subtle">
            {isTakenOver ? "Staff taken over — bot paused" : "Bot active"}
          </p>
        </div>
        {isTakenOver ? (
          <Button
            size="sm"
            variant="outline"
            onClick={handleEndChat}
            disabled={isToggling}
          >
            {isToggling ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <UserX className="mr-2 h-3 w-3" />
            )}
            End Chat
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleTakeChat}
            disabled={isToggling}
          >
            {isToggling ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <UserCheck className="mr-2 h-3 w-3" />
            )}
            Take Chat
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="space-y-3 p-4" aria-live="polite">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">No messages yet</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.direction === "outbound" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[75%] rounded-lg px-3 py-2",
                    msg.direction === "outbound"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={cn(
                      "mt-1 text-xs",
                      msg.direction === "outbound"
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground",
                    )}
                  >
                    {formatTimestamp(msg.sent_at)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {error && (
        <div className="border-t border-danger/20 bg-danger/5 px-4 py-2">
          <p className="text-xs text-danger">{error}</p>
        </div>
      )}

      <div className="border-t p-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isSending}
            aria-label="Message input"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            aria-label="Send message"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
