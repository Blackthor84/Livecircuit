"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  inviteEventCoHostAction,
  removeEventCoHostAction,
} from "@/lib/actions/event-hosts";
import type { EventHostRow } from "@/lib/services/event-hosts.service";

export function EventCoHostsPanel({
  eventId,
  initialHosts,
}: {
  eventId: string;
  initialHosts: EventHostRow[];
}) {
  const [hosts, setHosts] = useState(initialHosts);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState<"invite" | string | null>(null);

  async function invite() {
    setLoading("invite");
    const result = await inviteEventCoHostAction({ eventId, username });
    setLoading(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Co-host invited");
    setUsername("");
    window.location.reload();
  }

  async function remove(userId: string) {
    setLoading(userId);
    const result = await removeEventCoHostAction({ eventId, userId });
    setLoading(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setHosts((prev) => prev.filter((host) => host.user_id !== userId));
    toast.success("Co-host removed");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="cohost-username">Invite co-host by username</Label>
          <Input
            id="cohost-username"
            placeholder="@fanusername"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <Button
          type="button"
          disabled={loading === "invite" || !username.trim()}
          onClick={() => void invite()}
        >
          {loading === "invite" ? "Inviting…" : "Invite"}
        </Button>
      </div>

      {hosts.length ? (
        <ul className="space-y-2">
          {hosts.map((host) => {
            const profile = Array.isArray(host.profiles) ? host.profiles[0] : host.profiles;
            const label = profile?.display_name ?? profile?.username ?? "Co-host";
            const initials = label.slice(0, 2).toUpperCase();
            return (
              <li
                key={host.id}
                className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="size-8">
                    {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    {profile?.username ? (
                      <p className="text-xs text-muted-foreground">@{profile.username}</p>
                    ) : null}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loading === host.user_id}
                  onClick={() => void remove(host.user_id)}
                >
                  Remove
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No co-hosts yet. Invite another performer or moderator to join the broadcast.
        </p>
      )}
    </div>
  );
}
