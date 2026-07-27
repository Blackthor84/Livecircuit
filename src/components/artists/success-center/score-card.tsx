"use client";

import { motion } from "framer-motion";
import { AnimatedCounter } from "@/components/demo/naming-rights/animated-counter";
import { getFitScoreColorClasses, type ScoreItem } from "@/lib/demo/artist-success-center-utils";
import { cn } from "@/lib/utils";

export function ScoreCard({
  title,
  score,
  resetKey,
  className,
}: {
  title: string;
  score: ScoreItem;
  resetKey?: string;
  className?: string;
}) {
  const colors = getFitScoreColorClasses(score.color);

  return (
    <div className={cn("glass-panel rounded-2xl p-5", className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <p className={cn("text-4xl font-bold tabular-nums", colors.text)}>
          <AnimatedCounter value={score.score} format="number" resetKey={resetKey ?? String(score.score)} />
        </p>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", colors.bg, colors.text)}>
          {score.label}
        </span>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className={cn("h-full rounded-full bg-gradient-to-r", colors.bar)}
          initial={{ width: 0 }}
          whileInView={{ width: `${score.score}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{score.explanation}</p>
    </div>
  );
}
