"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createFeatureFlagAction,
  deleteFeatureFlagAction,
  updateFeatureFlagAction,
} from "@/lib/actions/feature-flags-admin";
import type { MonetizationFeatureFlag } from "@/lib/monetization/types";
import { cn } from "@/lib/utils";

const VISIBILITY_OPTIONS = [
  "enabled", "disabled", "hidden", "coming_soon", "beta_only", "agency_only", "admin_only",
] as const;

export function AdminFeatureFlagsPanel({ flags }: { flags: MonetizationFeatureFlag[] }) {
  const [pending, startTransition] = useTransition();
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");

  return (
    <div className="space-y-8">
      <Card className="glass-panel border-white/10">
        <CardHeader><CardTitle>Create Feature Flag</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Input placeholder="flag_key" value={newKey} onChange={(e) => setNewKey(e.target.value)} className="max-w-xs" />
          <Input placeholder="Label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="max-w-xs" />
          <Button
            disabled={pending || !newKey || !newLabel}
            onClick={() =>
              startTransition(async () => {
                const res = await createFeatureFlagAction({ flagKey: newKey, label: newLabel, isEnabled: false });
                if (res.ok) { toast.success("Flag created"); setNewKey(""); setNewLabel(""); }
                else toast.error(res.error);
              })
            }
          >
            Create
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {flags.map((flag) => (
          <FeatureFlagEditor key={flag.flagKey} flag={flag} pending={pending} startTransition={startTransition} />
        ))}
      </div>
    </div>
  );
}

function FeatureFlagEditor({
  flag,
  pending,
  startTransition,
}: {
  flag: MonetizationFeatureFlag;
  pending: boolean;
  startTransition: (fn: () => void) => void;
}) {
  const [label, setLabel] = useState(flag.label);
  const [visibility, setVisibility] = useState(flag.visibility);
  const [isEnabled, setIsEnabled] = useState(flag.isEnabled);
  const [rolloutPercent, setRolloutPercent] = useState(flag.rolloutPercent);

  return (
    <Card className="glass-panel border-white/10">
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-sm text-primary">{flag.flagKey}</p>
            <p className="text-xs text-muted-foreground">v{flag.version}</p>
          </div>
          <div className="flex gap-2">
            <Badge className={cn(isEnabled ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-500/20")}>
              {isEnabled ? "Enabled" : "Disabled"}
            </Badge>
            <Badge variant="outline">{visibility}</Badge>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div>
            <Label>Visibility</Label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as typeof visibility)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-background px-3 py-2 text-sm"
            >
              {VISIBILITY_OPTIONS.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Rollout %</Label>
            <Input type="number" min={0} max={100} value={rolloutPercent} onChange={(e) => setRolloutPercent(Number(e.target.value))} />
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} />
              Enabled
            </label>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await updateFeatureFlagAction({
                  flagKey: flag.flagKey,
                  label,
                  visibility,
                  isEnabled,
                  rolloutPercent,
                });
                if (res.ok) toast.success("Flag updated");
                else toast.error(res.error);
              })
            }
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await deleteFeatureFlagAction(flag.flagKey);
                if (res.ok) toast.success("Flag deleted");
                else toast.error(res.error);
              })
            }
          >
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
