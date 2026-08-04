"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function GlassPanel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl", className)}>{children}</div>
  );
}

export function StatTile({ label, value, delta, className }: { label: string; value: string; delta?: string; className?: string }) {
  return (
    <motion.div whileHover={{ y: -2, scale: 1.02 }} className={cn("rounded-xl border border-white/10 bg-black/50 p-3 backdrop-blur-xl", className)}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <motion.p key={value} initial={{ scale: 1.06 }} animate={{ scale: 1 }} className="mt-1 text-lg font-bold tabular-nums sm:text-xl">
        {value}
      </motion.p>
      {delta ? <p className="mt-0.5 text-[10px] font-medium text-emerald-400">{delta}</p> : null}
    </motion.div>
  );
}

export function ActionButton({
  icon: Icon,
  label,
  onClick,
  variant = "default",
  small,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: "default" | "primary" | "accent";
  small?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.07, y: -2 }}
      whileTap={{ scale: 0.93 }}
      className={cn(
        "flex items-center gap-1.5 rounded-full border font-medium backdrop-blur-xl transition",
        small ? "px-2.5 py-1.5 text-[10px]" : "px-3.5 py-2 text-xs sm:px-4 sm:text-sm",
        variant === "primary" && "border-primary/40 bg-primary/20 text-primary",
        variant === "accent" && "border-emerald-400/40 bg-emerald-500/15 text-emerald-300",
        variant === "default" && "border-white/10 bg-black/70 hover:border-white/20"
      )}
    >
      <Icon className={cn(small ? "size-3" : "size-3.5")} />
      {label}
    </motion.button>
  );
}

export function EnergyMeter({ label, value, color = "primary" }: { label: string; value: number; color?: "primary" | "amber" }) {
  return (
    <GlassPanel className="p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}%</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className={cn("h-full rounded-full", color === "amber" ? "bg-amber-400" : "bg-gradient-to-r from-primary to-accent")}
          animate={{ width: `${value}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
    </GlassPanel>
  );
}
