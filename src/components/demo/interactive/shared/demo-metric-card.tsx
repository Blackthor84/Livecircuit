"use client";

import { motion } from "framer-motion";
import { AnimatedCounter } from "@/components/demo/naming-rights/animated-counter";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function DemoMetricCard({
  label,
  value,
  prefix = "",
  suffix = "",
  icon: Icon,
  trend,
  className,
  format = "compact",
  resetKey,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon?: LucideIcon;
  trend?: number;
  className?: string;
  format?: "compact" | "number";
  resetKey?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "glass-panel group relative overflow-hidden rounded-2xl p-5 transition-colors hover:border-primary/30",
        className
      )}
    >
      <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-100 opacity-0" />
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        {Icon ? <Icon className="size-4 text-primary/60" /> : null}
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums sm:text-3xl">
        {prefix}
        <AnimatedCounter value={value} format={format} resetKey={resetKey} />
        {suffix}
      </p>
      {trend != null ? (
        <p className={cn("mt-1 text-xs font-medium", trend >= 0 ? "text-emerald-400" : "text-red-400")}>
          {trend >= 0 ? "+" : ""}{trend}% vs last month
        </p>
      ) : null}
    </motion.div>
  );
}
