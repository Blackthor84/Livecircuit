"use client";

import { useEffect, useState } from "react";
import { MessageSquareQuote } from "lucide-react";
import type { RehearsalFeedbackRow } from "@/lib/data/rehearsal";
import { createClient } from "@/lib/supabase/client";

type Props = {
  eventId: string;
  initialFeedback: RehearsalFeedbackRow[];
};

export function StudioFanFeedback({ eventId, initialFeedback }: Props) {
  const [feedback, setFeedback] = useState(initialFeedback);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`rehearsal-feedback-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "rehearsal_feedback",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          setFeedback((prev) => [payload.new as RehearsalFeedbackRow, ...prev]);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventId]);

  if (feedback.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Test fan feedback will appear here instantly when reviewers submit ratings.
      </p>
    );
  }

  return (
    <ul className="max-h-64 space-y-3 overflow-y-auto">
      {feedback.map((item) => (
        <li key={item.id} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <MessageSquareQuote className="size-4 text-primary" />
            {item.reviewer_label ?? "Test fan"}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Audio {item.audio_rating}/5 · Video {item.video_rating}/5 · Lighting {item.lighting_rating}/5 ·
            Camera {item.camera_rating ?? "—"}/5 · Sync {item.sync_rating}/5 · Overall {item.overall_rating}/5
          </p>
          {item.comment ? <p className="mt-2 italic">&ldquo;{item.comment}&rdquo;</p> : null}
        </li>
      ))}
    </ul>
  );
}
