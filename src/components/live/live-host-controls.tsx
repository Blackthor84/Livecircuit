"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { endLiveAction } from "@/lib/actions/live-event";
import type { EventStatus } from "@/types/database";

export function LiveHostControls({
  eventId,
  status,
  artistSlug,
  eventSlug,
  liveUrl,
}: {
  eventId: string;
  status: EventStatus;
  artistSlug?: string;
  eventSlug?: string;
  liveUrl?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"studio" | "end" | null>(null);

  const destination =
    liveUrl ??
    (artistSlug && eventSlug ? `/artists/${artistSlug}/events/${eventSlug}` : undefined);

  const studioPath = `/artist/events/${eventId}/production`;

  function openStudio() {
    setLoading("studio");
    router.push(studioPath);
  }

  async function endLive() {
    setLoading("end");
    const result = await endLiveAction({ eventId });
    setLoading(null);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Stream ended");
      router.refresh();
    }
  }

  if (status === "ended" || status === "cancelled") return null;

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "live" ? (
        <Button type="button" size="sm" disabled={loading === "studio"} onClick={openStudio}>
          {loading === "studio" ? "Opening green room…" : "Go live"}
        </Button>
      ) : (
        <>
          {destination ? (
            <Button type="button" size="sm" variant="secondary" href={destination}>
              Enter live room
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={loading === "end"}
            onClick={() => void endLive()}
          >
            {loading === "end" ? "Ending…" : "End stream"}
          </Button>
        </>
      )}
      {status !== "live" ? (
        <Button type="button" size="sm" variant="outline" href={studioPath}>
          Virtual Production Studio
        </Button>
      ) : null}
    </div>
  );
}
