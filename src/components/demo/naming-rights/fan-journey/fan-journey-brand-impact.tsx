"use client";

import { motion } from "framer-motion";
import { AnimatedCounter } from "@/components/demo/naming-rights/animated-counter";
import { FadeUp, FadeUpItem, FadeUpStagger } from "@/components/demo/naming-rights/fade-up";
import { useSponsorVisualizer } from "@/components/demo/naming-rights/sponsor-visualizer-context";
import { BRAND_IMPACT_METRICS } from "@/lib/demo/fan-journey-data";
import { getBrandImpactTotals } from "@/lib/demo/fan-journey-utils";
import { cn } from "@/lib/utils";

export function FanJourneyBrandImpact({ compact }: { compact?: boolean }) {
  const { form, resetKey, theme } = useSponsorVisualizer();
  const totals = getBrandImpactTotals(form.expectedAttendance, form.tierId, form.contractYears);

  const values: Record<string, number> = {
    fansReached: totals.fansReached,
    digitalImpressions: totals.digitalImpressions,
    livestreamViews: totals.livestreamViews,
    emailOpens: totals.emailOpens,
    pushNotifications: totals.pushNotifications,
    ticketPurchases: totals.ticketPurchases,
    chatMessages: totals.chatMessages,
    socialShares: totals.socialShares,
    repeatVisitors: totals.repeatVisitors,
    brandRecall: totals.brandRecall,
  };

  return (
    <FadeUp className={cn("glass-panel rounded-3xl p-6 sm:p-10", compact && "p-5")}>
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Final Dashboard</p>
        <h3 className={cn("mt-2 font-bold tracking-tight", compact ? "text-2xl" : "text-3xl sm:text-4xl")}>
          Your Brand Impact
        </h3>
      </div>

      <FadeUpStagger
        className={cn(
          "mt-8 grid gap-4",
          compact ? "grid-cols-2 sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        )}
      >
        {BRAND_IMPACT_METRICS.map((metric, i) => {
          const raw = values[metric.id];

          return (
            <FadeUpItem key={metric.id}>
              <motion.div
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                whileHover={{ scale: 1.02, borderColor: `${theme.primary}44` }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {metric.label}
                </p>
                <p className="mt-2 text-2xl font-bold tabular-nums sm:text-3xl" style={{ color: theme.gold }}>
                  {metric.id === "brandRecall" ? (
                    <>
                      <AnimatedCounter value={raw} format="number" resetKey={resetKey} />
                      <span className="text-lg">%</span>
                    </>
                  ) : (
                    <AnimatedCounter value={raw} resetKey={resetKey} />
                  )}
                </p>
                <motion.div
                  className="mt-3 h-1 overflow-hidden rounded-full bg-white/10"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: theme.gradient }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${50 + (i % 5) * 10}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  />
                </motion.div>
              </motion.div>
            </FadeUpItem>
          );
        })}
      </FadeUpStagger>
    </FadeUp>
  );
}
