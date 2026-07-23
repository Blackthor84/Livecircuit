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
}: {
  eventId: string;
  status: EventStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"live" | "end" | null>(null);

  async function goLive() {
    setLoading("live");
    const result = await goLiveAction({ eventId });
    setLoading(null);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("You are live");
      router.refresh();
    }
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
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={loading === "end"}
          onClick={() => void endLive()}
        >
          {loading === "end" ? "Ending…" : "End stream"}
        </Button>
      )}
    </div>
  );
}
