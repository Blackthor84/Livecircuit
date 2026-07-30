"use client";

import { useState } from "react";
import { Copy, Link2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateRehearsalAccessAction } from "@/lib/actions/studio";
import type { RehearsalAccessMode } from "@/lib/streaming/studio/types";

const MODES: { value: RehearsalAccessMode; label: string; description: string }[] = [
  { value: "self_only", label: "Self only", description: "Only you can see the rehearsal." },
  { value: "admin", label: "Admin", description: "Platform admins may join as reviewers." },
  { value: "moderator", label: "Moderator", description: "Event co-hosts and admins may join." },
  { value: "test_fan", label: "Test fan", description: "Invite a test fan with a private link." },
  { value: "invite_link", label: "Private invite link", description: "Anyone with the link can review." },
];

type Props = {
  eventId: string;
  accessMode: RehearsalAccessMode;
  inviteUrl: string | null;
  onUpdated?: (inviteUrl: string | null) => void;
};

export function StudioRehearsalInvites({ eventId, accessMode, inviteUrl, onUpdated }: Props) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState(accessMode);

  async function saveMode(next: RehearsalAccessMode) {
    setMode(next);
    setLoading(true);
    const result = await updateRehearsalAccessAction({ eventId, accessMode: next });
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onUpdated?.(result.inviteUrl ?? null);
    toast.success("Rehearsal access updated");
  }

  async function copyLink() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    toast.success("Invite link copied");
  }

  const selected = MODES.find((m) => m.value === mode);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Users className="size-4" />
        Sound check mode
      </div>
      <p className="text-sm text-muted-foreground">
        Private rehearsal — nothing is public until you click Go Live.
      </p>
      <Select value={mode} disabled={loading} onValueChange={(v) => void saveMode(v as RehearsalAccessMode)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MODES.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected ? <p className="text-xs text-muted-foreground">{selected.description}</p> : null}
      {inviteUrl ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => void copyLink()}>
            <Copy className="size-4" />
            Copy invite link
          </Button>
          <Button type="button" size="sm" variant="ghost" href={inviteUrl}>
            <Link2 className="size-4" />
            Open test fan view
          </Button>
        </div>
      ) : null}
    </div>
  );
}
