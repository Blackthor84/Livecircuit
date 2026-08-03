"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Building2, Eye, Sparkles, Users, Zap } from "lucide-react";
import { AnimatedCounter } from "@/components/demo/naming-rights/animated-counter";
import { Button } from "@/components/ui/button";
import { DEMO_SPONSOR_ARENAS } from "@/lib/demo/interactive/data";
import type { DemoSponsorArena } from "@/lib/demo/interactive/types";
import { cn } from "@/lib/utils";

export function SponsorDemoExperience() {
  const [selected, setSelected] = useState<DemoSponsorArena | null>(null);
  const [checkoutPhase, setCheckoutPhase] = useState<"idle" | "processing" | "done">("idle");

  const startCheckout = () => {
    setCheckoutPhase("processing");
    setTimeout(() => setCheckoutPhase("done"), 2200);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Sponsor Portal</h1>
        <p className="mt-2 text-muted-foreground">Reserve digital arena naming rights and premium placements.</p>
      </div>

      <AnimatePresence mode="wait">
        {checkoutPhase !== "idle" ? (
          <motion.div
            key="checkout"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-auto max-w-lg space-y-6 text-center"
          >
            {checkoutPhase === "processing" ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="mx-auto size-16 rounded-full border-2 border-primary border-t-transparent"
                />
                <h2 className="text-xl font-bold">Processing sponsorship...</h2>
                <p className="text-muted-foreground">{selected?.name}</p>
              </>
            ) : (
              <>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-6xl">✓</motion.div>
                <h2 className="text-gradient text-2xl font-bold">Sponsorship Reserved</h2>
                <p className="text-muted-foreground">Founder pricing locked for {selected?.name}</p>
                <p className="text-3xl font-bold text-emerald-400">${selected?.founderPrice.toLocaleString()}/yr</p>
                <Button onClick={() => { setCheckoutPhase("idle"); setSelected(null); }}>Browse More Arenas</Button>
              </>
            )}
          </motion.div>
        ) : selected ? (
          <motion.div key="detail" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl space-y-6">
            <button type="button" onClick={() => setSelected(null)} className="text-sm text-muted-foreground hover:text-foreground">← Back to arenas</button>
            <div className="glass-panel rounded-2xl p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">{selected.state} · {selected.tier}</p>
                  <h2 className="mt-2 text-2xl font-bold">{selected.name}</h2>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground line-through">${selected.regularPrice.toLocaleString()}/yr</p>
                  <p className="text-2xl font-bold text-emerald-400">${selected.founderPrice.toLocaleString()}/yr</p>
                  <p className="text-xs text-amber-400">Founder pricing</p>
                </div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-white/[0.03] p-4 text-center">
                  <Users className="mx-auto size-5 text-primary" />
                  <p className="mt-2 text-lg font-bold"><AnimatedCounter value={selected.monthlyVisitors} resetKey={selected.id} /></p>
                  <p className="text-xs text-muted-foreground">Monthly visitors</p>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-4 text-center">
                  <Zap className="mx-auto size-5 text-amber-400" />
                  <p className="mt-2 text-lg font-bold">{selected.engagement}%</p>
                  <p className="text-xs text-muted-foreground">Engagement</p>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-4 text-center">
                  <Eye className="mx-auto size-5 text-cyan-400" />
                  <p className="mt-2 text-lg font-bold"><AnimatedCounter value={selected.expectedReach} resetKey={`reach-${selected.id}`} /></p>
                  <p className="text-xs text-muted-foreground">Expected reach</p>
                </div>
              </div>
              <div className="mt-6">
                <p className="text-sm font-semibold">Available sponsorships</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selected.availableSlots.map((slot) => (
                    <span key={slot} className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs">{slot}</span>
                  ))}
                </div>
              </div>
              <Button className="mt-8 w-full gap-2" size="lg" onClick={startCheckout}>
                Reserve Sponsorship <ArrowRight className="size-4" />
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DEMO_SPONSOR_ARENAS.map((arena, i) => (
              <motion.button
                key={arena.id}
                type="button"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4, scale: 1.02 }}
                onClick={() => setSelected(arena)}
                className="glass-panel rounded-2xl p-6 text-left transition hover:border-primary/30"
              >
                <Building2 className="size-5 text-primary" />
                <p className="mt-3 font-bold">{arena.name}</p>
                <p className="text-sm text-muted-foreground">{arena.state} · {arena.tier}</p>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">From</p>
                    <p className="text-lg font-bold text-emerald-400">${arena.founderPrice.toLocaleString()}/yr</p>
                  </div>
                  <Sparkles className="size-4 text-amber-400" />
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
