"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import { getUnreadMessagesCountAction } from "@/app/(dashboard)/chat/actions";

export function useUnreadMessagesCount(initialCount: number = 0) {
  const [unreadCount, setUnreadCount] = useState<number>(initialCount);
  const isFetchingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const res = await getUnreadMessagesCountAction();
      if (res.success && typeof res.data === "number") {
        setUnreadCount(res.data);
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    refreshCount();

    // 4-second polling fallback so count stays in sync even if sockets pause
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshCount();
      }
    }, 4000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshCount();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const supabase = createBrowserSupabaseClient();
    const channelName = `unread-count-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messenger_messages" },
        () => refreshCount()
      );

    channel.subscribe();

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [refreshCount]);

  return { unreadCount, refreshCount };
}
