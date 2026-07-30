"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Radio, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  broadcastLiveFromStudioAction,
  updateGoLiveChecklistAction,
} from "@/lib/actions/studio";
import {
  GO_LIVE_CHECKLIST_ITEMS,
  type GoLiveChecklist,
  type GoLiveChecklistKey,
} from "@/lib/production/studio";

type Props = {
  eventId: string;
  livePath: string;
  checklist: GoLiveChecklist;
  canGoLive: boolean;
};

export function VirtualGoLivePanel({ eventId, livePath, checklist: initial, canGoLive }: Props) {
  const router = useRouter();
  const [checklist, setChecklist] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const completed = GO_LIVE_CHECKLIST_ITEMS.filter((item) => checklist[item.key]).length;
  const allComplete = completed === GO_LIVE_CHECKLIST_ITEMS.length;

  async function toggle(key: GoLiveChecklistKey, checked: boolean) {
    const next = { ...checklist, [key]: checked };
    setChecklist(next);
    await updateGoLiveChecklistAction({ eventId, checklist: next });
  }

  async function goLive(force = false) {
    if (!canGoLive) {
      toast.error("Only the artist can start the public broadcast");
      return;
    }
    if (!force && !allComplete) {
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
    toast.success("You are live! Followers notified, chat open, analytics running.");
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
          Final checklist before public broadcast. Nothing is visible until you confirm.
        </p>
        <ul className="mt-4 space-y-2">
          {GO_LIVE_CHECKLIST_ITEMS.map((item) => (
            <li key={item.key} className="flex items-center gap-2">
              <Checkbox
                id={`go-live-${item.key}`}
                checked={Boolean(checklist[item.key])}
                disabled={!canGoLive}
                onCheckedChange={(checked) => void toggle(item.key, checked === true)}
              />
              <Label htmlFor={`go-live-${item.key}`}>{item.label}</Label>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          {completed}/{GO_LIVE_CHECKLIST_ITEMS.length} checks complete
        </p>
        {canGoLive ? (
          <Button type="button" className="mt-4 w-full" disabled={loading} onClick={() => void goLive()}>
            {loading ? "Starting broadcast…" : "GO LIVE — start public broadcast"}
          </Button>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">
            Producers can complete the checklist; the artist confirms Go Live.
          </p>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-amber-300" />
              Checklist incomplete
            </DialogTitle>
            <DialogDescription>
              {completed}/{GO_LIVE_CHECKLIST_ITEMS.length} final checks are complete. Go live anyway
              if you are confident everything is working.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Keep preparing
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
