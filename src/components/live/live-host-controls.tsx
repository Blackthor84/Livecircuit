"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { endLiveAction, goLiveAction } from "@/lib/actions/live-event";
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
  const [loading, setLoading] = useState<"live" | "end" | null>(null);

  const destination =
    liveUrl ??
    (artistSlug && eventSlug ? `/artists/${artistSlug}/events/${eventSlug}` : undefined);

  async function goLive() {
    setLoading("live");
    const result = await goLiveAction({ eventId });
    setLoading(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("You are live");
    const target = result.liveUrl ?? destination;
    if (target) router.push(target);
    else router.refresh();
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
        <Button type="button" size="sm" disabled={loading === "live"} onClick={() => void goLive()}>
          {loading === "live" ? "Starting…" : "Go live"}
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
    </div>
  );
}
