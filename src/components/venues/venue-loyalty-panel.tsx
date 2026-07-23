"use client";

import { Award, Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VenueLoyaltyPageData } from "@/lib/data/venue-loyalty";
import { cn } from "@/lib/utils";

const levelLabels = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  diamond: "Diamond",
};

const reasonLabels: Record<string, string> = {
  check_in: "Concourse check-in",
  review: "Venue review",
  attendance: "Show attendance",
  merchandise: "Merchandise",
  referral: "Referral",
  artist_support: "Artist support",
  share: "Share",
  admin_adjustment: "Adjustment",
  reward_redemption: "Redemption",
};

export function VenueLoyaltyPanel({
  data,
  userSignedIn,
}: {
  data: VenueLoyaltyPageData;
  userSignedIn: boolean;
}) {
  const earnedCount = data.badges.filter((b) => b.earned).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="secondary" className="mb-2">
            Venue loyalty
          </Badge>
          <h2 className="text-2xl font-bold">{data.venue.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Earn points for check-ins, reviews, and shows — unlock badges and climb the local fan board.
          </p>
        </div>
        <Button variant="outline" href={`/livecircuit/venues/${data.venue.slug}/community`}>
          Community hub
        </Button>
      </div>

      {!userSignedIn ? (
        <p className="glass-panel rounded-xl p-4 text-sm text-muted-foreground">
          <Button variant="link" className="h-auto p-0" href="/login">
            Sign in
          </Button>{" "}
          to track points and badges at this venue.
        </p>
      ) : data.profile ? (
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="size-5 text-primary" />
              {levelLabels[data.profile.level]} · {data.profile.points.toLocaleString()} pts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.profile.progress.next ? (
              <>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                    style={{ width: `${data.profile.progress.progressPct}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.profile.progress.progressPct}% toward {levelLabels[data.profile.progress.next]} (
                  {data.profile.progress.nextThreshold!.toLocaleString()} pts)
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Max tier reached — thank you for being a superfan.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <p className="glass-panel rounded-xl p-4 text-sm text-muted-foreground">
          Visit the{" "}
          <Button variant="link" className="h-auto p-0" href={`/livecircuit/venues/${data.venue.slug}/concourse`}>
            digital concourse
          </Button>{" "}
          or leave a review to start earning points.
        </p>
      )}

      <section>
        <h3 className="flex items-center gap-2 font-semibold">
          <Award className="size-4 text-primary" />
          Badges ({earnedCount}/{data.badges.length})
        </h3>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {data.badges.map((badge) => (
            <li
              key={badge.id}
              className={cn(
                "glass-panel rounded-xl p-4 text-sm",
                badge.earned ? "border border-primary/30" : "opacity-70"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{badge.name}</p>
                {badge.earned ? (
                  <Badge className="shrink-0">Earned</Badge>
                ) : (
                  <Badge variant="secondary" className="shrink-0">
                    Locked
                  </Badge>
                )}
              </div>
              {badge.description ? (
                <p className="mt-2 text-muted-foreground">{badge.description}</p>
              ) : null}
              {badge.earned_at ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(badge.earned_at).toLocaleDateString()}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {userSignedIn && data.ledger.length > 0 ? (
        <section>
          <h3 className="flex items-center gap-2 font-semibold">
            <Sparkles className="size-4 text-primary" />
            Recent activity
          </h3>
          <ul className="mt-4 space-y-2 text-sm">
            {data.ledger.map((entry) => (
              <li key={entry.id} className="flex justify-between rounded-lg border border-white/10 px-3 py-2">
                <span className="text-muted-foreground">
                  {reasonLabels[entry.reason] ?? entry.reason}
                </span>
                <span className="tabular-nums font-medium text-primary">
                  +{entry.delta_points}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
