"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DollarSign, ShoppingBag, Ticket, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type LiveStat = { label: string; value: number; icon: typeof DollarSign; prefix?: string };

const INITIAL: LiveStat[] = [
  { label: "Live Revenue", value: 1_247_800, icon: DollarSign, prefix: "$" },
  { label: "Tickets Sold", value: 842_000, icon: Ticket },
  { label: "Merchandise", value: 189_400, icon: ShoppingBag, prefix: "$" },
  { label: "Active Fans", value: 24_800, icon: Users },
];

export function LiveRevenueTicker({ className }: { className?: string }) {
  const [stats, setStats] = useState(INITIAL);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) =>
        prev.map((s) => ({
          ...s,
          value: s.value + Math.floor(Math.random() * (s.label === "Active Fans" ? 15 : 800)),
        }))
      );
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {stats.map((stat) => (
        <motion.div
          key={stat.label}
          layout
          className="glass-panel flex items-center gap-3 rounded-xl px-4 py-3"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
            <stat.icon className="size-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">{stat.label}</p>
            <motion.p
              key={stat.value}
              initial={{ opacity: 0.6, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-lg font-bold tabular-nums"
            >
              {stat.prefix}
              {stat.value.toLocaleString()}
            </motion.p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
