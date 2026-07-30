"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Radio, ShieldAlert } from "lucide-react";
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
import { broadcastLiveFromStudioAction } from "@/lib/actions/studio";
import { checklistProgress } from "@/lib/streaming/studio/checklist";
import type { StudioChecklist } from "@/lib/streaming/studio/types";

type Props = {
  eventId: string;
  checklist: StudioChecklist;
  livePath: string;
};

export function StudioGoLivePanel({ eventId, checklist, livePath }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const progress = checklistProgress(checklist);

  async function goLive(force = false) {
    if (!force && !progress.ready) {
      setConfirmOpen(true);
      return;
    }
    setLoading(true);
    const result = await broadcastLiveFromStudioAction({ eventId });
    setLoading(false);
    setConfirmOpen(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("You are live! Fans have been notified.");
    router.push(result.liveUrl ?? livePath);
  }

  return (
    <>
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <div className="flex items-center gap-2 font-semibold text-emerald-200">
          <Radio className="size-4" />
          Go Live
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Start the public broadcast, notify followers, open chat, and begin analytics.
        </p>
        <Button
          type="button"
          className="mt-4"
          disabled={loading}
          onClick={() => void goLive()}
        >
          {loading ? "Starting broadcast…" : "Go Live — start public broadcast"}
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-amber-300" />
              Some checks incomplete
            </DialogTitle>
            <DialogDescription>
              {progress.completedRequired}/{progress.requiredTotal} required pre-show checks are complete.
              You can go live anyway if you are confident everything is working.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Keep testing
            </Button>
            <Button type="button" disabled={loading} onClick={() => void goLive(true)}>
              Go live anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
