"use client";

import { Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { FadeUp } from "@/components/demo/naming-rights/fade-up";
import { useSponsorVisualizer } from "@/components/demo/naming-rights/sponsor-visualizer-context";
import { LIVECIRCUIT_ARENA_POINTS, TRADITIONAL_ARENA_POINTS } from "@/lib/demo/fan-journey-data";
import { cn } from "@/lib/utils";

export function FanJourneyComparison({ compact }: { compact?: boolean }) {
  const { displayCompany, arenaName, theme } = useSponsorVisualizer();

  return (
    <FadeUp>
      <div className={cn("space-y-6", compact && "space-y-4")}>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Traditional vs LiveCircuit</p>
          <h3 className={cn("mt-2 font-bold tracking-tight", compact ? "text-2xl" : "text-3xl sm:text-4xl")}>
            Why digital naming rights win
          </h3>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ComparisonColumn
            title="Traditional Arena"
            subtitle="Physical naming rights"
            points={TRADITIONAL_ARENA_POINTS}
            variant="muted"
            icon={X}
          />
          <ComparisonColumn
            title="LiveCircuit Arena"
            subtitle={arenaName}
            points={LIVECIRCUIT_ARENA_POINTS}
            variant="premium"
            icon={Check}
            theme={theme}
            highlight={displayCompany}
          />
        </div>
      </div>
    </FadeUp>
  );
}

function ComparisonColumn({
  title,
  subtitle,
  points,
  variant,
  icon: Icon,
  theme,
  highlight,
}: {
  title: string;
  subtitle: string;
  points: readonly string[];
  variant: "muted" | "premium";
  icon: typeof Check;
  theme?: { primary: string; gradient: string; gold: string };
  highlight?: string;
}) {
  const isPremium = variant === "premium";

  return (
    <motion.div
      className={cn(
        "rounded-3xl border p-6 sm:p-8",
        isPremium ? "border-amber-500/30 bg-amber-500/5" : "border-white/10 bg-white/[0.02]"
      )}
      whileHover={{ y: isPremium ? -4 : 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="mb-6">
        <h4 className="text-xl font-bold">{title}</h4>
        <p className={cn("mt-1 text-sm", isPremium ? "text-amber-400/90" : "text-muted-foreground")}>{subtitle}</p>
        {isPremium && highlight ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Powered by <span style={{ color: theme?.gold }}>{highlight}</span>
          </p>
        ) : null}
      </div>

      <ul className="space-y-3">
        {points.map((point, i) => (
          <motion.li
            key={point}
            className="flex items-center gap-3 text-sm"
            initial={{ opacity: 0, x: isPremium ? 12 : -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04 }}
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full",
                isPremium ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/10 text-red-400/80"
              )}
            >
              <Icon className="size-3.5" />
            </span>
            {point}
          </motion.li>
        ))}
      </ul>

      {isPremium && theme ? (
        <div
          className="mt-6 rounded-xl px-4 py-3 text-center text-xs font-semibold text-white"
          style={{ background: theme.gradient }}
        >
          11 touchpoints · Real-time analytics · {highlight}
        </div>
      ) : null}
    </motion.div>
  );
}
