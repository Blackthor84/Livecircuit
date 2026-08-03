"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Building2, Mail, Sparkles, Users } from "lucide-react";
import { AnimatedCounter } from "@/components/demo/naming-rights/animated-counter";
import { DemoStadiumBackground } from "@/components/demo/interactive/shared/demo-stadium-bg";
import { FINALE_STATS } from "@/lib/demo/interactive/data";
import { Button } from "@/components/ui/button";

export function CinematicFinale() {
  return (
    <div className="fixed inset-0 z-[200] flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#030308]">
      <DemoStadiumBackground />

      {/* Fireworks */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute size-2 rounded-full"
          style={{
            left: `${10 + (i * 4.5) % 80}%`,
            top: `${15 + (i * 7) % 50}%`,
            background: ["#a855f7", "#06b6d4", "#f59e0b", "#ec4899"][i % 4],
          }}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: [0, 3, 0], opacity: [1, 0.8, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.4, repeatDelay: 1 }}
        />
      ))}

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xs font-semibold uppercase tracking-[0.4em] text-primary"
        >
          LiveCircuit
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-gradient mt-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
        >
          Welcome to the Future of Live Entertainment.
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-5"
        >
          {FINALE_STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 + i * 0.15 }}
              className="glass-panel rounded-2xl p-6"
            >
              <p className="text-3xl font-black tabular-nums sm:text-4xl">
                {stat.isText ? (
                  stat.suffix
                ) : (
                  <>
                    <AnimatedCounter value={stat.value} format="compact" resetKey="finale" />
                    {stat.suffix}
                  </>
                )}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.2 }}
          className="mt-16 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
          <Link href="/register">
            <Button size="lg" className="gap-2 bg-gradient-to-r from-primary to-accent px-8 shadow-lg shadow-primary/30">
              Join LiveCircuit <ArrowRight className="size-4" />
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.6 }}
          className="mt-8 flex flex-wrap justify-center gap-3"
        >
          {[
            { label: "Request a Demo", href: "/contact", icon: Mail },
            { label: "Join the Waitlist", href: "/register", icon: Users },
            { label: "Agency Partner", href: "/agency", icon: Building2 },
            { label: "Become a Sponsor", href: "/demo/naming-rights", icon: Sparkles },
          ].map((cta) => (
            <Link key={cta.label} href={cta.href}>
              <Button variant="outline" size="sm" className="gap-2 border-white/10 bg-white/5">
                <cta.icon className="size-3.5" /> {cta.label}
              </Button>
            </Link>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 }} className="mt-12">
          <Link href="/demo/interactive" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Interactive Demo
          </Link>
        </motion.div>
      </div>

      {/* Stadium silhouette */}
      <motion.div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-primary/20 via-primary/5 to-transparent"
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
    </div>
  );
}
