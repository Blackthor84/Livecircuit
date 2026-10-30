"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cancelLiveEventAction, endLiveAction } from "@/lib/actions/live-event";
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
  const [loading, setLoading] = useState<"studio" | "end" | "cancel" | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

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

  async function confirmCancelEvent() {
    setLoading("cancel");
    const result = await cancelLiveEventAction({ eventId });
    setLoading(null);
    setCancelDialogOpen(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Event cancelled");
    router.refresh();
  }

  if (status === "ended") {
    return (
      <p className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        This performance is completed. Ticket payout eligibility follows your LiveCircuit payout schedule.
      </p>
    );
  }

  if (status === "cancelled") {
    return (
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
        This event was cancelled. Ticket holders may need refunds or updates from you. FastPay ticket earnings
        remain on hold until financial review is complete.
      </p>
    );
  }

  const canCancel = status === "draft" || status === "scheduled" || status === "live";

  return (
    <>
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
        {canCancel ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
            disabled={loading != null}
            onClick={() => setCancelDialogOpen(true)}
          >
            Cancel event
          </Button>
        ) : null}
      </div>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this event?</DialogTitle>
            <DialogDescription>
              Cancelling notifies fans that the performance will not happen. Ticket holders may expect refunds,
              rescheduling, or communication from you. If tickets were sold under FastPay, artist earnings for this
              event are placed on hold and will not enter payout until refunds and disputes are resolved. Completed
              performances cannot be cancelled—use End stream instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep event
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={loading === "cancel"}
              onClick={() => void confirmCancelEvent()}
            >
              {loading === "cancel" ? "Cancelling…" : "Yes, cancel event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
