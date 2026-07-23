"use client";

import { useMemo, useState } from "react";
import { Award, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ACHIEVEMENT_CATEGORIES } from "@/lib/constants/achievements";
import type { AchievementsReport } from "@/lib/types/achievements";
import { cn } from "@/lib/utils";

export function AchievementsHub({ report }: { report: AchievementsReport }) {
  const [filter, setFilter] = useState<string>("all");

  const overallPercent = report.totalAvailable
    ? Math.round((report.totalEarned / report.totalAvailable) * 100)
    : 0;

  const visibleCategories = useMemo(() => {
    if (filter === "all") return report.categories;
    return report.categories.filter((c) => c.category === filter);
  }, [report.categories, filter]);

  return (
    <div className="space-y-8">
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-400" />
            Achievement progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-bold tabular-nums">
                {report.totalEarned}
                <span className="text-lg text-muted-foreground"> / {report.totalAvailable}</span>
              </p>
              <p className="text-sm text-muted-foreground">Unlocked for {report.displayName ?? "you"}</p>
            </div>
            <p className="text-sm font-medium text-primary">{overallPercent}% complete</p>
          </div>
          <Progress value={overallPercent} className="h-2" />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={cn(
            "rounded-full px-3 py-1 text-sm",
            filter === "all" ? "bg-primary text-primary-foreground" : "bg-white/5 hover:bg-white/10"
          )}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        {ACHIEVEMENT_CATEGORIES.filter((c) => report.categories.some((g) => g.category === c.value)).map((c) => (
          <button
            key={c.value}
            type="button"
            className={cn(
              "rounded-full px-3 py-1 text-sm",
              filter === c.value ? "bg-primary text-primary-foreground" : "bg-white/5 hover:bg-white/10"
            )}
            onClick={() => setFilter(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {visibleCategories.map((group) => (
        <section key={group.category}>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold">{group.categoryLabel}</h2>
              <p className="text-sm text-muted-foreground">{group.categoryBlurb}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {group.earnedCount}/{group.totalCount} earned
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.entries.map((entry) => (
              <li key={entry.slug}>
                <Card
                  className={cn(
                    "glass-panel h-full border-white/10",
                    entry.earned && "border-amber-400/40 bg-amber-400/5"
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <span aria-hidden>{entry.icon ?? "🏅"}</span>
                        {entry.name}
                      </CardTitle>
                      {entry.earned ? (
                        <Badge className="gap-1 shrink-0">
                          <Award className="h-3 w-3" />
                          Earned
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">{entry.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Progress value={entry.progressPercent} className="h-1.5" />
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {Math.min(entry.currentValue, entry.targetValue).toLocaleString()} /{" "}
                      {entry.targetValue.toLocaleString()}
                      {entry.earnedAt ? (
                        <span> · {new Date(entry.earnedAt).toLocaleDateString()}</span>
                      ) : null}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
