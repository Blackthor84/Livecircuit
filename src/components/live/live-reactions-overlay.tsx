"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

type FloatingReaction = {
  id: string;
  emoji: string;
};

export function LiveReactionsOverlay({ eventId }: { eventId: string }) {
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`event-reactions-${eventId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reactions", filter: `event_id=eq.${eventId}` },
        (payload) => {
          const row = payload.new as { id: string; emoji: string };
          setReactions((prev) => [...prev, { id: row.id, emoji: row.emoji }]);
          window.setTimeout(() => {
            setReactions((prev) => prev.filter((r) => r.id !== row.id));
          }, 2500);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventId]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <AnimatePresence>
        {reactions.map((reaction, index) => (
          <motion.span
            key={reaction.id}
            initial={{ opacity: 0, y: 20, x: `${20 + (index % 5) * 15}%` }}
            animate={{ opacity: 1, y: -80 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.2, ease: "easeOut" }}
            className="absolute bottom-8 text-3xl"
            style={{ left: `${10 + (index % 6) * 14}%` }}
          >
            {reaction.emoji}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
