"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { WALK_OF_FAME_CRITERIA } from "@/lib/constants/walk-of-fame";
import { formatHofMetric } from "@/lib/services/venue-hof-format";
import type { WalkOfFameArtistEntry, WalkOfFameStar } from "@/lib/types/walk-of-fame";
import { cn } from "@/lib/utils";
import { WalkOfFameVoteButton } from "@/components/walk-of-fame/walk-of-fame-vote-button";

function starPosition(index: number) {
  const angle = (index / WALK_OF_FAME_CRITERIA.length) * Math.PI * 1.4 - Math.PI * 0.7;
  const radius = 42;
  return {
    left: `${50 + Math.sin(angle) * radius}%`,
    top: `${50 - Math.cos(angle) * radius}%`,
  };
}

function metricLabelFor(star: WalkOfFameStar): string {
  switch (star.criterion) {
    case "revenue":
      return "revenue";
    case "years_active":
      return "years";
    case "attendance":
      return "tickets";
    default:
      return "score";
  }
}

export function WalkOfFameStarField({
  entry,
  showVote,
  viewerHasVoted,
}: {
  entry: WalkOfFameArtistEntry;
  showVote?: boolean;
  viewerHasVoted?: boolean;
}) {
  const [selected, setSelected] = useState<WalkOfFameStar | null>(null);
  const earned = new Set(entry.stars.map((s) => s.criterion));

  return (
    <>
      <article className="glass-panel rounded-xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href={`/artists/${entry.slug}`} className="text-lg font-semibold hover:text-primary">
              {entry.stageName}
            </Link>
            <p className="text-sm text-muted-foreground">
              {entry.starCount} star{entry.starCount === 1 ? "" : "s"} · {entry.fanVoteCount} fan vote
              {entry.fanVoteCount === 1 ? "" : "s"}
            </p>
            {entry.verified ? (
              <Badge variant="secondary" className="mt-2">
                Verified artist
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" href={`/walk-of-fame/${entry.slug}`}>
              View stars
            </Button>
            {showVote ? (
              <WalkOfFameVoteButton
                artistId={entry.artistId}
                disabled={viewerHasVoted}
                fanVoteCount={entry.fanVoteCount}
              />
            ) : null}
          </div>
        </div>

        <div className="relative mx-auto mt-6 aspect-[2/1] max-w-md">
          <div className="absolute inset-x-0 bottom-0 h-1 rounded-full bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
          {WALK_OF_FAME_CRITERIA.map((c, index) => {
            const lit = earned.has(c.value);
            const star = entry.stars.find((s) => s.criterion === c.value);
            const pos = starPosition(index);
            return (
              <button
                key={c.value}
                type="button"
                disabled={!lit || !star}
                onClick={() => star && setSelected(star)}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 rounded-full p-1 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  lit ? "hover:scale-110" : "opacity-30 cursor-default"
                )}
                style={pos}
                aria-label={lit ? c.label : `${c.label} (not yet earned)`}
              >
                <Star
                  className={cn(
                    "h-8 w-8",
                    lit ? "fill-amber-400 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" : "text-muted-foreground"
                  )}
                />
              </button>
            );
          })}
        </div>
      </article>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="glass-panel border-white/10 sm:max-w-md">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-300" />
                  {selected.criterionLabel}
                </DialogTitle>
                <DialogDescription>{selected.blurb}</DialogDescription>
              </DialogHeader>
              <p className="text-sm font-medium">{entry.stageName}</p>
              <p className="text-muted-foreground">{selected.summary}</p>
              <p className="text-2xl font-bold tabular-nums text-amber-400/90">
                {formatHofMetric(selected.metricValue, metricLabelFor(selected))}
              </p>
              <p className="text-xs text-muted-foreground">
                Earned {new Date(selected.earnedAt).toLocaleDateString()}
              </p>
              <Button href={`/artists/${entry.slug}`} className="w-full">
                Artist profile
              </Button>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
