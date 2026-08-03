"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AnimatedCounter } from "@/components/demo/naming-rights/animated-counter";
import { DEMO_STATES, STATE_MAP_POSITIONS, TOUR_CONNECTIONS } from "@/lib/demo/interactive/data";
import type { DemoStateArena } from "@/lib/demo/interactive/types";
import { cn } from "@/lib/utils";

export function UsaTourMapExperience() {
  const [selected, setSelected] = useState<DemoStateArena | null>(DEMO_STATES[0]!);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">USA Digital Tour Map</h1>
        <p className="mt-2 text-muted-foreground">Click any state to explore arenas, shows, and fan growth.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="relative lg:col-span-3">
          <div className="glass-panel relative aspect-[4/3] overflow-hidden rounded-2xl">
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {TOUR_CONNECTIONS.map(({ from, to }, i) => {
                const a = STATE_MAP_POSITIONS[from];
                const b = STATE_MAP_POSITIONS[to];
                if (!a || !b) return null;
                return (
                  <motion.line
                    key={`${from}-${to}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="oklch(0.72 0.19 300 / 0.4)"
                    strokeWidth="0.3"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0.2, 0.6, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                  />
                );
              })}
            </svg>
            {DEMO_STATES.map((state) => {
              const pos = STATE_MAP_POSITIONS[state.abbr];
              if (!pos) return null;
              const active = selected?.abbr === state.abbr;
              return (
                <motion.button
                  key={state.abbr}
                  type="button"
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  whileHover={{ scale: 1.2 }}
                  onClick={() => setSelected(state)}
                >
                  <span
                    className={cn(
                      "relative flex size-8 items-center justify-center rounded-full text-[10px] font-bold transition sm:size-10 sm:text-xs",
                      active
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/50"
                        : "bg-white/10 text-foreground hover:bg-primary/30"
                    )}
                  >
                    {active ? (
                      <span className="absolute inset-0 animate-ping rounded-full bg-primary/40" />
                    ) : null}
                    {state.abbr}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {selected ? (
          <motion.div
            key={selected.abbr}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-panel space-y-4 rounded-2xl p-6 lg:col-span-2"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">{selected.abbr}</p>
              <h2 className="text-2xl font-bold">{selected.state}</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-white/[0.03] p-3">
                <p className="text-xs text-muted-foreground">Arenas</p>
                <p className="text-lg font-bold">{selected.arenas}</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-3">
                <p className="text-xs text-muted-foreground">Upcoming shows</p>
                <p className="text-lg font-bold">{selected.upcomingShows}</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-3">
                <p className="text-xs text-muted-foreground">Tickets sold</p>
                <p className="text-lg font-bold"><AnimatedCounter value={selected.ticketsSold} resetKey={selected.abbr} /></p>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-3">
                <p className="text-xs text-muted-foreground">Fan growth</p>
                <p className="text-lg font-bold text-emerald-400">+{selected.fanGrowth}%</p>
              </div>
            </div>
            {selected.sponsor ? (
              <p className="text-sm"><span className="text-muted-foreground">Sponsor:</span> {selected.sponsor}</p>
            ) : null}
            {selected.featuredArtist ? (
              <p className="text-sm"><span className="text-muted-foreground">Featured artist:</span> {selected.featuredArtist}</p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              Audience: <AnimatedCounter value={selected.audience} resetKey={`aud-${selected.abbr}`} /> monthly
            </p>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
