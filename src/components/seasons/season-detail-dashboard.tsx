"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Trophy, Gift, Award, Store, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { equipSeasonProfileFrameAction } from "@/lib/actions/seasons";
import type { SeasonDetail } from "@/lib/types/seasons";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SeasonDetailDashboard({ season, signedIn }: { season: SeasonDetail; signedIn: boolean }) {
  const router = useRouter();
  const [equipping, setEquipping] = useState(false);
  const stats = season.userStats;
  const nextReward = season.rewards.find((r) => (stats?.points ?? 0) < r.points);

  async function equipFrame() {
    setEquipping(true);
    const result = await equipSeasonProfileFrameAction(season.slug);
    setEquipping(false);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Profile frame equipped");
      router.refresh();
    }
  }

  return (
    <div className="space-y-10">
      <Card className="glass-panel overflow-hidden border-white/10">
        <div className="bg-gradient-to-br from-primary/20 via-transparent to-transparent p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge className="mb-3 capitalize">{season.status}</Badge>
              <h2 className="text-3xl font-bold">{season.name}</h2>
              {season.tagline ? <p className="mt-2 text-muted-foreground">{season.tagline}</p> : null}
              {season.description ? <p className="mt-4 max-w-2xl text-sm text-muted-foreground">{season.description}</p> : null}
            </div>
            <span className="text-5xl" aria-hidden>
              {season.decorationIcon ?? "✨"}
            </span>
          </div>
        </div>
        {signedIn && stats ? (
          <CardContent className="grid gap-4 border-t border-white/10 p-6 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Season points</p>
              <p className="text-2xl font-bold tabular-nums">{stats.points}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Your rank</p>
              <p className="text-2xl font-bold tabular-nums">{stats.rank ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tickets · Stamps</p>
              <p className="font-medium">
                {stats.ticketsCount} · {stats.stampsCount}
              </p>
            </div>
            <div>
              {nextReward ? (
                <>
                  <p className="text-xs text-muted-foreground">Next: {nextReward.tier}</p>
                  <Progress className="mt-2 h-2" value={(stats.points / nextReward.points) * 100} />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">All reward tiers unlocked</p>
              )}
            </div>
          </CardContent>
        ) : null}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-panel border-white/10">
          <CardHeader className="flex flex-row items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <CardTitle>Leaderboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {season.leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground">Earn points to appear on the board.</p>
            ) : (
              season.leaderboard.map((row) => (
                <div
                  key={row.userId}
                  className={cn(
                    "flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm",
                    row.isYou && "border-primary/40 bg-primary/5"
                  )}
                >
                  <span>
                    #{row.rank} {row.displayName}
                    {row.isYou ? " (you)" : ""}
                  </span>
                  <span className="tabular-nums text-muted-foreground">{row.points} pts</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardHeader className="flex flex-row items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <CardTitle>Season rewards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {season.rewards.map((r) => (
              <div key={r.tier} className="rounded-lg border border-white/10 px-3 py-2 text-sm">
                <p className="font-medium">
                  {r.tier} · {r.points} pts
                </p>
                <p className="text-muted-foreground">{r.reward}</p>
              </div>
            ))}
            {season.profileFrame && signedIn ? (
              <Button size="sm" disabled={equipping} onClick={() => void equipFrame()}>
                Equip {season.profileFrame.label}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold">Exclusive badges</h3>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {season.badges.map((b) => (
            <li key={b.id} className="glass-panel rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden>
                  {b.icon ?? "🏅"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{b.name}</p>
                  <p className="text-sm text-muted-foreground">{b.description}</p>
                  {b.earned ? (
                    <Badge className="mt-2 bg-primary/20 text-primary">Earned</Badge>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">{b.pointsRequired} pts required</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <Store className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold">Limited merchandise</h3>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {season.merch.map((m) => (
            <li key={m.id} className="glass-panel rounded-xl p-4">
              <p className="font-medium">{m.name}</p>
              {m.description ? <p className="mt-1 text-sm text-muted-foreground">{m.description}</p> : null}
              <p className="mt-2 font-medium">{formatCents(m.priceCents)}</p>
              {m.limitedQuantity != null ? (
                <p className="text-xs text-muted-foreground">
                  {m.soldOut ? "Sold out" : `${m.limitedQuantity} left`}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {season.decoratedVenues.length > 0 ? (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold">Venue decorations</h3>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {season.decoratedVenues.map((v) => (
              <li key={v.venueSlug}>
                <Link
                  href={`/livecircuit/venues/${v.venueSlug}`}
                  className="glass-panel flex items-center justify-between rounded-xl p-4 text-sm hover:border-primary/30"
                >
                  <span>
                    {v.themeIcon ? `${v.themeIcon} ` : ""}
                    {v.venueName}
                  </span>
                  <span className="text-muted-foreground">{v.themeName}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {season.status === "archived" && Object.keys(season.archiveStats).length > 0 ? (
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle>Historical archive</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {Object.entries(season.archiveStats).map(([key, value]) => (
              <div key={key} className="rounded-lg border border-white/10 px-3 py-2 text-sm">
                <p className="capitalize text-muted-foreground">{key.replace(/([A-Z])/g, " $1")}</p>
                <p className="font-medium">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
