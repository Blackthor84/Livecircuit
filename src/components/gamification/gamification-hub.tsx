"use client";

import { useTransition } from "react";
import { Crown, Flame, Medal, Sparkles, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { equipGamificationTitleAction } from "@/lib/actions/gamification";
import type { GamificationReport, QuestEntry } from "@/lib/types/gamification";
import { cn } from "@/lib/utils";

function QuestCard({ quest }: { quest: QuestEntry }) {
  return (
    <Card className={cn("glass-panel border-white/10", quest.completed && "border-primary/40 bg-primary/5")}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <span aria-hidden>{quest.icon ?? "⭐"}</span>
            {quest.name}
          </CardTitle>
          {quest.completed ? <Badge>Done</Badge> : null}
        </div>
        <p className="text-xs text-muted-foreground">{quest.description}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        <Progress value={quest.progressPercent} className="h-1.5" />
        <p className="text-xs text-muted-foreground">
          {Math.min(quest.currentValue, quest.targetValue)} / {quest.targetValue} · +{quest.xpReward} XP
          {quest.coinReward > 0 ? ` · +${quest.coinReward} coins` : ""}
        </p>
      </CardContent>
    </Card>
  );
}

export function GamificationHub({ report }: { report: GamificationReport }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-8">
      <Card className="glass-panel border-white/10">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Level {report.level}
                {report.prestige > 0 ? ` · Prestige ${report.prestige}` : ""}
              </p>
              <h2 className="text-2xl font-bold">{report.equippedTitleLabel}</h2>
              <p className="text-sm text-muted-foreground">{report.xp.toLocaleString()} total XP</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold tabular-nums">{report.levelProgress.percent}%</p>
              <p className="text-xs text-muted-foreground">to next level</p>
            </div>
          </div>
          <Progress value={report.levelProgress.percent} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {report.levelProgress.current} / {report.levelProgress.needed} XP this level
          </p>
        </CardContent>
      </Card>

      <section>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Crown className="h-5 w-5 text-amber-400" />
          Titles
        </h3>
        <div className="flex flex-wrap gap-2">
          {report.unlockedTitles.map((t) => (
            <Button
              key={t.slug}
              size="sm"
              variant={report.equippedTitleSlug === t.slug ? "default" : "outline"}
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  await equipGamificationTitleAction({ titleSlug: t.slug });
                });
              }}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </section>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Daily quests</TabsTrigger>
          <TabsTrigger value="weekly">Weekly challenges</TabsTrigger>
          <TabsTrigger value="monthly">Monthly goals</TabsTrigger>
        </TabsList>
        <TabsContent value="daily" className="mt-4 grid gap-3 sm:grid-cols-2">
          {report.daily.map((q) => (
            <QuestCard key={q.slug} quest={q} />
          ))}
        </TabsContent>
        <TabsContent value="weekly" className="mt-4 grid gap-3 sm:grid-cols-2">
          {report.weekly.map((q) => (
            <QuestCard key={q.slug} quest={q} />
          ))}
        </TabsContent>
        <TabsContent value="monthly" className="mt-4 grid gap-3 sm:grid-cols-2">
          {report.monthly.map((q) => (
            <QuestCard key={q.slug} quest={q} />
          ))}
        </TabsContent>
      </Tabs>

      <section>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Trophy className="h-5 w-5 text-primary" />
          XP leaderboard
        </h3>
        <ul className="space-y-2">
          {report.leaderboard.map((row) => (
            <li
              key={row.userId}
              className={cn(
                "flex items-center justify-between rounded-lg border border-white/10 px-4 py-2 text-sm",
                row.userId === report.userId && "border-primary/40 bg-primary/5"
              )}
            >
              <span className="flex items-center gap-3">
                <Medal className="h-4 w-4 text-muted-foreground" />
                <span>
                  #{row.rank} {row.displayName}
                </span>
                <span className="text-xs text-muted-foreground">{row.titleLabel}</span>
              </span>
              <span className="flex items-center gap-2 tabular-nums">
                <Flame className="h-3.5 w-3.5 text-amber-400" />
                {row.xp.toLocaleString()} XP
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
