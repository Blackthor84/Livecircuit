"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useUnreadNotifications(userId: string, initialCount: number) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-unread-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => setCount((prev) => prev + 1)
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as { read_at: string | null };
          const oldRow = payload.old as { read_at?: string | null };
          if (!oldRow.read_at && row.read_at) {
            setCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return count;
}
