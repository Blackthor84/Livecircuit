"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Building2, Map, Mic2, Sparkles, Ticket, Users } from "lucide-react";
import { FadeUp, FadeUpItem, FadeUpStagger } from "@/components/demo/naming-rights/fade-up";
import { LiveRevenueTicker } from "@/components/demo/interactive/shared/live-revenue-ticker";
import { LiveSocialFeed } from "@/components/demo/interactive/shared/live-social-feed";
import { DemoStadiumBackground } from "@/components/demo/interactive/shared/demo-stadium-bg";

const CARDS = [
  {
    href: "/demo/interactive/artist",
    emoji: "🎤",
    title: "Artist Demo",
    subtitle: "Schedule shows, watch ticket sales explode, and track your digital tour empire.",
    gradient: "from-violet-500/20 to-purple-600/10",
    border: "hover:border-violet-500/40",
    icon: Mic2,
  },
  {
    href: "/demo/interactive/fan",
    emoji: "🎟",
    title: "Fan Demo",
    subtitle: "Browse events, buy tickets, enter the arena, chat, merch, VIP, and collect badges.",
    gradient: "from-cyan-500/20 to-blue-600/10",
    border: "hover:border-cyan-500/40",
    icon: Ticket,
  },
  {
    href: "/demo/interactive/agency",
    emoji: "🏢",
    title: "Agency Demo",
    subtitle: "Manage your roster, bookings, revenue, and AI-powered tour recommendations.",
    gradient: "from-emerald-500/20 to-teal-600/10",
    border: "hover:border-emerald-500/40",
    icon: Building2,
  },
];

const SECONDARY = [
  { href: "/demo/interactive/sponsor", title: "Sponsor Portal", desc: "Reserve digital arena naming rights", icon: Users },
  { href: "/demo/interactive/arena", title: "Digital Arena", desc: "Immersive live concert experience", icon: Sparkles },
  { href: "/demo/interactive/map", title: "USA Tour Map", desc: "50 states, glowing digital tours", icon: Map },
];

export function InteractiveDemoHub() {
  return (
    <div className="relative -mx-4 -mt-8 min-h-[calc(100vh-4rem)] overflow-hidden sm:-mx-6 sm:-mt-12">
      <DemoStadiumBackground />
      <section className="relative flex min-h-[70vh] flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-primary">Interactive Product Demo</p>
          <h1 className="text-gradient text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            The Future of Live Entertainment.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Perform. Watch. Manage. All Inside LiveCircuit.
          </p>
        </motion.div>
        <motion.div
          className="mt-10 flex flex-wrap justify-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {["50 States", "500+ Arenas", "Live Analytics", "Zero Backend"].map((tag) => (
            <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-muted-foreground">
              {tag}
            </span>
          ))}
        </motion.div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-12 sm:px-6">
        <FadeUpStagger className="grid gap-6 lg:grid-cols-3">
          {CARDS.map((card, i) => (
            <FadeUpItem key={card.href}>
              <Link href={card.href}>
                <motion.div
                  whileHover={{ y: -6, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={`glass-panel group relative h-full overflow-hidden rounded-3xl border p-8 ${card.border} bg-gradient-to-br ${card.gradient}`}
                >
                  <span className="text-4xl">{card.emoji}</span>
                  <h2 className="mt-4 text-2xl font-bold">{card.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{card.subtitle}</p>
                  <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-primary">
                    Launch demo <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                  </div>
                </motion.div>
              </Link>
            </FadeUpItem>
          ))}
        </FadeUpStagger>

        <FadeUp className="mt-12">
          <h3 className="mb-6 text-center text-lg font-semibold text-muted-foreground">Also explore</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {SECONDARY.map((item) => (
              <Link key={item.href} href={item.href}>
                <motion.div whileHover={{ scale: 1.02 }} className="glass-panel flex items-center gap-4 rounded-2xl p-5 transition hover:border-primary/30">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-primary/15">
                    <item.icon className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </FadeUp>

        <FadeUp className="mt-16 space-y-8">
          <LiveRevenueTicker />
          <div className="grid gap-8 lg:grid-cols-2">
            <LiveSocialFeed maxItems={4} />
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-lg font-bold">Why LiveCircuit?</h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-2"><span className="text-primary">✓</span> Digital touring across all 50 US states</li>
                <li className="flex gap-2"><span className="text-primary">✓</span> Premium artist, fan, agency & sponsor experiences</li>
                <li className="flex gap-2"><span className="text-primary">✓</span> Real-time analytics, ticketing & merch</li>
                <li className="flex gap-2"><span className="text-primary">✓</span> Immersive virtual arenas with live chat & VIP</li>
              </ul>
              <Link
                href="/demo/interactive/finale"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                See the finale <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </FadeUp>
      </section>
    </div>
  );
}
