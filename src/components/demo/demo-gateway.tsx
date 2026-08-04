"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Building2, Mic2, Ticket } from "lucide-react";
import { FadeUp, FadeUpItem, FadeUpStagger } from "@/components/demo/naming-rights/fade-up";
import { DemoStadiumBackground } from "@/components/demo/interactive/shared/demo-stadium-bg";
import { Button } from "@/components/ui/button";
import { DEMO_META } from "@/lib/demo/cinematic/constants";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const DEMOS = [
  {
    href: ROUTES.demoFan,
    audience: "fan" as const,
    meta: DEMO_META.fan,
    icon: Ticket,
    gradient: "from-cyan-600/25 via-blue-500/10 to-transparent",
    border: "border-cyan-500/20 hover:border-cyan-400/50",
    story: "Walk through the tunnel. Hear the crowd. Become part of the show.",
  },
  {
    href: ROUTES.demoArtist,
    audience: "artist" as const,
    meta: DEMO_META.artist,
    icon: Mic2,
    gradient: "from-violet-600/25 via-purple-500/10 to-transparent",
    border: "border-violet-500/20 hover:border-violet-400/50",
    story: "Step backstage. Count down. Command the stage and the crowd.",
  },
  {
    href: ROUTES.demoAgency,
    audience: "agency" as const,
    meta: DEMO_META.agency,
    icon: Building2,
    gradient: "from-emerald-600/25 via-teal-500/10 to-transparent",
    border: "border-emerald-500/20 hover:border-emerald-400/50",
    story: "Monitor your roster. Enter any live arena. Manage at scale.",
  },
];

export function DemoGateway() {
  return (
    <div className="relative overflow-hidden">
      <DemoStadiumBackground />
      <section className="relative flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} className="max-w-3xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-primary">Three Perspectives · One Platform</p>
          <h1 className="text-gradient text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">The Future of Live Entertainment</h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">Three completely separate experiences. Same world-class arena engine. Choose your role.</p>
        </motion.div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <FadeUpStagger className="grid gap-8 lg:grid-cols-3">
          {DEMOS.map((demo, i) => (
            <FadeUpItem key={demo.href}>
              <motion.article whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 260, damping: 22 }} className={cn("glass-panel group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-gradient-to-br p-8", demo.border, demo.gradient)}>
                <demo.icon className="size-8 text-primary" />
                <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-primary">{demo.meta.subtitle}</p>
                <h2 className="mt-2 text-2xl font-bold">{demo.meta.title}</h2>
                <p className="mt-3 flex-1 text-sm text-muted-foreground">{demo.story}</p>
                <Button href={demo.href} size="lg" className="mt-8 w-full gap-2 bg-gradient-to-r from-primary to-accent shadow-lg shadow-primary/25">
                  {demo.meta.entryCta}
                  <ArrowRight className="size-4" />
                </Button>
              </motion.article>
            </FadeUpItem>
          ))}
        </FadeUpStagger>

        <FadeUp className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">No signup required · Fully interactive · Enable sound inside each demo</p>
          <Link href={`${ROUTES.interactiveDemo}/finale`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            Join LiveCircuit <ArrowRight className="size-4" />
          </Link>
        </FadeUp>
      </section>
    </div>
  );
}
