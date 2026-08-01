"use client";

import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateAgencyArtistStatusAction } from "@/lib/actions/agencies";
import type { AgencyManagedArtist } from "@/lib/agency/types";
import { toast } from "sonner";

export function AgencyArtistsPanel({ orgId, roster }: { orgId: string; roster: AgencyManagedArtist[] }) {
  const [pending, startTransition] = useTransition();

  function setStatus(rosterId: string, status: "active" | "suspended" | "ended") {
    startTransition(async () => {
      const result = await updateAgencyArtistStatusAction({ orgId, rosterId, status });
      if (!result.ok) toast.error(result.error);
      else toast.success(`Artist ${status}`);
    });
  }

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle>Managed artists ({roster.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {roster.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Invite artists to your roster to manage bookings, schedules, and revenue from one dashboard.
          </p>
        ) : (
          <ul className="space-y-3">
            {roster.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{row.artists?.stage_name ?? "Artist"}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.artists?.category} · {row.artists?.follower_count?.toLocaleString() ?? 0} followers
                  </p>
                  {row.notes ? <p className="mt-1 text-sm italic text-muted-foreground">{row.notes}</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{row.status}</Badge>
                  {row.status === "pending" ? (
                    <Button type="button" size="sm" disabled={pending} onClick={() => setStatus(row.id, "active")}>
                      Approve
                    </Button>
                  ) : null}
                  {row.status === "active" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => setStatus(row.id, "suspended")}
                    >
                      Suspend
                    </Button>
                  ) : null}
                  {row.status !== "ended" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => setStatus(row.id, "ended")}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
