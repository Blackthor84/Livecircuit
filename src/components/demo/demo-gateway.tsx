"use client";

import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowRight, Building2, Mic2, Play, Sparkles, Ticket, TrendingUp, Users } from "lucide-react";
import { FadeUp, FadeUpItem, FadeUpStagger } from "@/components/demo/naming-rights/fade-up";
import { DemoStadiumBackground } from "@/components/demo/interactive/shared/demo-stadium-bg";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const DEMOS = [
  {
    href: ROUTES.demoArtist,
    title: "Artist Demo",
    description:
      "Build a digital tour, schedule arena stops, watch ticket sales climb, and explore real-time performance analytics.",
    gradient: "from-violet-600/25 via-purple-500/10 to-transparent",
    glow: "group-hover:shadow-violet-500/20",
    border: "border-violet-500/20 group-hover:border-violet-400/50",
    icon: Mic2,
    metric: { label: "Ticket revenue", value: "$284K", trend: "+34%" },
    highlights: ["Tour builder", "Live analytics", "Merch & tips"],
  },
  {
    href: ROUTES.demoFan,
    title: "Fan Demo",
    description:
      "Discover shows, buy tickets, enter a virtual arena, chat with the crowd, shop merch, and unlock VIP experiences.",
    gradient: "from-cyan-600/25 via-blue-500/10 to-transparent",
    glow: "group-hover:shadow-cyan-500/20",
    border: "border-cyan-500/20 group-hover:border-cyan-400/50",
    icon: Ticket,
    metric: { label: "Fans in arena", value: "12.4K", trend: "Live now" },
    highlights: ["Ticket checkout", "Virtual arena", "Badges & VIP"],
  },
  {
    href: ROUTES.demoAgency,
    title: "Agency Demo",
    description:
      "Manage your artist roster, track bookings and revenue, and act on AI-powered tour recommendations across the US.",
    gradient: "from-emerald-600/25 via-teal-500/10 to-transparent",
    glow: "group-hover:shadow-emerald-500/20",
    border: "border-emerald-500/20 group-hover:border-emerald-400/50",
    icon: Building2,
    metric: { label: "Roster revenue", value: "$1.2M", trend: "+18%" },
    highlights: ["Roster CRM", "Bookings", "Tour intelligence"],
  },
] as const;

function DemoCard({ demo, index }: { demo: (typeof DEMOS)[number]; index: number }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-120, 120], [8, -8]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-120, 120], [-8, 8]), { stiffness: 200, damping: 20 });

  return (
    <FadeUpItem>
      <motion.article
        style={{ rotateX, rotateY, transformPerspective: 1200 }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          x.set(e.clientX - rect.left - rect.width / 2);
          y.set(e.clientY - rect.top - rect.height / 2);
        }}
        onMouseLeave={() => {
          x.set(0);
          y.set(0);
        }}
        whileHover={{ y: -8 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className={cn(
          "glass-panel group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-gradient-to-br p-8 shadow-xl transition-shadow duration-500",
          demo.border,
          demo.gradient,
          demo.glow
        )}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/10 blur-3xl transition group-hover:bg-primary/20" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
            <demo.icon className="size-7 text-primary" />
          </div>
          <motion.span
            className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: index * 0.3 }}
          >
            Interactive
          </motion.span>
        </div>

        <h2 className="relative mt-6 text-2xl font-bold tracking-tight sm:text-3xl">{demo.title}</h2>
        <p className="relative mt-3 flex-1 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {demo.description}
        </p>

        <div className="relative mt-6 rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{demo.metric.label}</p>
              <motion.p
                className="text-2xl font-bold tabular-nums"
                initial={{ opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + index * 0.1 }}
              >
                {demo.metric.value}
              </motion.p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400">
              <TrendingUp className="size-3" />
              {demo.metric.trend}
            </span>
          </div>
        </div>

        <ul className="relative mt-4 flex flex-wrap gap-2">
          {demo.highlights.map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground"
            >
              {tag}
            </li>
          ))}
        </ul>

        <Button
          href={demo.href}
          size="lg"
          className="relative mt-8 w-full gap-2 bg-gradient-to-r from-primary to-accent shadow-lg shadow-primary/25 transition group-hover:shadow-primary/40"
        >
          <Play className="size-4 fill-current" />
          Launch Demo
          <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
        </Button>
      </motion.article>
    </FadeUpItem>
  );
}

export function DemoGateway() {
  return (
    <div className="relative overflow-hidden">
      <DemoStadiumBackground />

      <section className="relative flex min-h-[72vh] flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl"
        >
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            <Sparkles className="size-3.5" />
            Product Preview
          </p>
          <h1 className="text-gradient text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Experience the Future of Live Entertainment
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Take an interactive tour of LiveCircuit from the perspective of an artist, fan, or talent agency.
          </p>
        </motion.div>

        <motion.div
          className="mt-10 flex flex-wrap justify-center gap-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6 }}
        >
          {[
            { icon: Mic2, label: "Artist workflows" },
            { icon: Ticket, label: "Fan experiences" },
            { icon: Building2, label: "Agency dashboards" },
          ].map((item) => (
            <span
              key={item.label}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-muted-foreground backdrop-blur-sm"
            >
              <item.icon className="size-3.5 text-primary" />
              {item.label}
            </span>
          ))}
        </motion.div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <FadeUpStagger className="grid gap-8 lg:grid-cols-3">
          {DEMOS.map((demo, i) => (
            <DemoCard key={demo.href} demo={demo} index={i} />
          ))}
        </FadeUpStagger>

        <FadeUp className="mt-16">
          <div className="glass-panel overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-primary/10 via-transparent to-accent/10 p-8 sm:p-10">
            <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">Beyond the gateway</p>
                <h3 className="mt-2 text-2xl font-bold sm:text-3xl">Explore sponsor portals, virtual arenas, and the USA tour map</h3>
                <p className="mt-3 text-muted-foreground">
                  After your role-based tour, dive into naming rights, immersive concert environments, and a glowing
                  nationwide tour visualization — all powered by realistic demo data.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" href={`${ROUTES.interactiveDemo}/sponsor`}>
                  <Users className="size-4" />
                  Sponsor Portal
                </Button>
                <Button variant="secondary" href={`${ROUTES.interactiveDemo}/arena`}>
                  Virtual Arena
                </Button>
                <Button variant="secondary" href={`${ROUTES.interactiveDemo}/map`}>
                  USA Tour Map
                </Button>
              </div>
            </div>
          </div>
        </FadeUp>

        <FadeUp className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">No account required — this is a live product demonstration.</p>
          <Link
            href={`${ROUTES.interactiveDemo}/finale`}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:underline"
          >
            See the finale and join LiveCircuit
            <ArrowRight className="size-4" />
          </Link>
        </FadeUp>
      </section>
    </div>
  );
}
