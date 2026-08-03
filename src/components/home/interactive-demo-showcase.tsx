"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Building2, Mic2, Play, Sparkles, Ticket } from "lucide-react";
import { FadeUp, FadeUpItem, FadeUpStagger } from "@/components/demo/naming-rights/fade-up";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const PREVIEWS = [
  {
    href: ROUTES.demoArtist,
    title: "Artist",
    description: "Create tours, sell tickets, track analytics",
    icon: Mic2,
    accent: "from-violet-500/20 to-purple-600/5 border-violet-500/20",
  },
  {
    href: ROUTES.demoFan,
    title: "Fan",
    description: "Buy tickets, enter arenas, collect badges",
    icon: Ticket,
    accent: "from-cyan-500/20 to-blue-600/5 border-cyan-500/20",
  },
  {
    href: ROUTES.demoAgency,
    title: "Agency",
    description: "Manage roster, bookings, and revenue",
    icon: Building2,
    accent: "from-emerald-500/20 to-teal-600/5 border-emerald-500/20",
  },
] as const;

/** Homepage showcase — product-first gateway to interactive demos. */
export function InteractiveDemoShowcase() {
  return (
    <section className="relative overflow-hidden border-y border-white/5 bg-black/20">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-accent/5" />
      <div className="pointer-events-none absolute -left-32 top-0 size-96 rounded-full bg-violet-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 size-96 rounded-full bg-cyan-600/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <FadeUp className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            <Sparkles className="size-3.5" />
            Interactive Demo
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            <span className="text-gradient">Try LiveCircuit before you join</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Click through real product workflows — digital tours, ticket checkout, virtual arenas, and agency
            dashboards — with polished demo data and guided onboarding.
          </p>
          <Button size="lg" href={ROUTES.demo} className="mt-8 gap-2 bg-gradient-to-r from-primary to-accent shadow-lg shadow-primary/25">
            <Play className="size-4 fill-current" />
            Experience LiveCircuit
            <ArrowRight className="size-4" />
          </Button>
        </FadeUp>

        <FadeUpStagger className="mt-14 grid gap-5 md:grid-cols-3">
          {PREVIEWS.map((preview) => (
            <FadeUpItem key={preview.href}>
              <Link href={preview.href}>
                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  className={cn(
                    "glass-panel group h-full rounded-2xl border bg-gradient-to-br p-6 transition hover:border-primary/30",
                    preview.accent
                  )}
                >
                  <div className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                    <preview.icon className="size-5 text-primary" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{preview.title} Demo</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{preview.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                    Launch Demo
                    <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </motion.div>
              </Link>
            </FadeUpItem>
          ))}
        </FadeUpStagger>
      </div>
    </section>
  );
}
