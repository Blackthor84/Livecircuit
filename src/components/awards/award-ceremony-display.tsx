"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Award, Radio, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AwardsCountdown } from "@/components/awards/awards-countdown";
import { castAwardVoteAction } from "@/lib/actions/awards";
import { ROUTES } from "@/lib/constants";
import { canCastAwardVote } from "@/lib/services/awards-countdown";
import type { AwardCategoryGroup, AwardCeremonyDetail } from "@/lib/types/awards";
import { cn } from "@/lib/utils";

function NomineeCard({
  ceremonyId,
  group,
  nominee,
  canVote,
}: {
  ceremonyId: string;
  group: AwardCategoryGroup;
  nominee: AwardCategoryGroup["nominees"][number];
  canVote: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const selected = group.viewerNomineeId === nominee.id;

  return (
    <Card
      className={cn(
        "glass-panel border-white/10",
        nominee.isWinner && "border-amber-400/50",
        selected && "ring-1 ring-primary/60"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{nominee.displayName}</CardTitle>
          {nominee.isWinner ? (
            <Badge className="gap-1 shrink-0">
              <Trophy className="h-3 w-3" />
              Winner
            </Badge>
          ) : null}
        </div>
        {nominee.subtitle ? <p className="text-xs text-muted-foreground">{nominee.subtitle}</p> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {nominee.voteCount.toLocaleString()} vote{nominee.voteCount === 1 ? "" : "s"}
        </p>
        <div className="flex flex-wrap gap-2">
          {nominee.linkHref ? (
            <Button size="sm" variant="outline" href={nominee.linkHref}>
              View
            </Button>
          ) : null}
          {canVote ? (
            <Button
              size="sm"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  await castAwardVoteAction({
                    ceremonyId,
                    category: group.category,
                    nomineeId: nominee.id,
                  });
                });
              }}
            >
              {selected ? "Your vote" : "Vote"}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function AwardCeremonyDisplay({ ceremony }: { ceremony: AwardCeremonyDetail }) {
  const canVote = canCastAwardVote(ceremony.status, ceremony.votingEndsAt);
  const isLive = ceremony.status === "live";

  return (
    <div className="space-y-10">
      <div className="glass-panel rounded-xl p-6 text-center">
        <h1 className="flex items-center justify-center gap-2 text-3xl font-bold">
          <Award className="h-8 w-8 text-amber-400" />
          {ceremony.title}
        </h1>
        {ceremony.tagline ? <p className="mt-2 text-muted-foreground">{ceremony.tagline}</p> : null}
        <Badge variant="secondary" className="mt-4 capitalize">
          {ceremony.status.replace("_", " ")}
        </Badge>
      </div>

      <AwardsCountdown
        status={ceremony.status}
        votingEndsAt={ceremony.votingEndsAt}
        ceremonyAt={ceremony.ceremonyAt}
      />

      {(isLive || ceremony.liveStreamUrl) && ceremony.status !== "archived" ? (
        <div className="glass-panel rounded-xl p-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Radio className="h-5 w-5 text-primary" />
            Live award show
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isLive
              ? "The ceremony is live — winners are being announced category by category."
              : "Stream will go live at ceremony time."}
          </p>
          {ceremony.liveStreamUrl ? (
            <Button className="mt-4" render={<Link href={ceremony.liveStreamUrl} target="_blank" rel="noopener noreferrer" />}>
              Watch live
            </Button>
          ) : null}
        </div>
      ) : null}

      {ceremony.archiveSummary && ceremony.status === "archived" ? (
        <p className="text-center text-muted-foreground">{ceremony.archiveSummary}</p>
      ) : null}

      <div className="space-y-12">
        {ceremony.categories.map((group) => (
          <section key={group.category}>
            <h2 className="text-xl font-semibold">{group.categoryLabel}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{group.categoryBlurb}</p>
            {group.nominees.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Nominees syncing from circuit data…</p>
            ) : (
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.nominees.map((nominee) => (
                  <li key={nominee.id}>
                    <NomineeCard
                      ceremonyId={ceremony.id}
                      group={group}
                      nominee={nominee}
                      canVote={canVote}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        <Link href={ROUTES.walkOfFame} className="text-primary hover:underline">
          Digital Walk of Fame
        </Link>
        {" · "}
        <Link href={`${ROUTES.awards}/archive`} className="text-primary hover:underline">
          Past ceremonies
        </Link>
      </p>
    </div>
  );
}
