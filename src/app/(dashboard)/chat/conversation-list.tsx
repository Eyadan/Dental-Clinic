"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Bot, User, Circle } from "lucide-react";
import type { ConversationWithDetails } from "./actions";

interface ConversationListProps {
  conversations: ConversationWithDetails[];
  selectedId: string | null;
  onSelect: (conversation: ConversationWithDetails) => void;
}

function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.patient_name?.toLowerCase().includes(query) ||
      conv.patient_psid.toLowerCase().includes(query) ||
      conv.last_message?.toLowerCase().includes(query)
    );
  });

  if (conversations.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <Bot className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium text-muted-foreground">No active conversations</p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Patient messages via Messenger will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm outline-none focus:border-primary"
          aria-label="Search conversations"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y">
          {filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={cn(
                "flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-surface-sunken",
                selectedId === conv.id && "bg-primary/5",
              )}
            >
              <div className="mt-0.5 flex-shrink-0">
                {conv.status === "taken_over" ? (
                  <User className="h-8 w-8 rounded-full bg-info/20 p-1.5 text-info" />
                ) : (
                  <Bot className="h-8 w-8 rounded-full bg-muted p-1.5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">
                    {conv.patient_name ?? `PSID: ${conv.patient_psid.slice(-6)}`}
                  </p>
                  <span className="flex-shrink-0 text-xs text-text-subtle">
                    {formatTimeAgo(conv.last_message_at)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-text-secondary">
                  {conv.last_message ?? "No messages yet"}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  {conv.status === "taken_over" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-info/10 px-2 py-0.5 text-xs font-medium text-info">
                      <User className="h-3 w-3" />
                      Staff
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      <Bot className="h-3 w-3" />
                      Bot Active
                    </span>
                  )}
                  {conv.unread_count > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-danger">
                      <Circle className="h-2 w-2 fill-current" />
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
