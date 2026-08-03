"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, Map, Mic2, Sparkles, Ticket, Users } from "lucide-react";
import { LiveCircuitLogo } from "@/components/brand/livecircuit-logo";
import { DemoStadiumBackground } from "@/components/demo/interactive/shared/demo-stadium-bg";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";

const NAV = [
  { href: ROUTES.demo, label: "Home", icon: Sparkles, exact: true },
  { href: ROUTES.demoArtist, label: "Artist", icon: Mic2 },
  { href: ROUTES.demoFan, label: "Fan", icon: Ticket },
  { href: ROUTES.demoAgency, label: "Agency", icon: Building2 },
  { href: `${ROUTES.interactiveDemo}/sponsor`, label: "Sponsor", icon: Users },
  { href: `${ROUTES.interactiveDemo}/arena`, label: "Arena", icon: Sparkles },
  { href: `${ROUTES.interactiveDemo}/map`, label: "Map", icon: Map },
];

export function InteractiveDemoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFinale = pathname.includes("/finale");

  if (isFinale) return <>{children}</>;

  return (
    <div className="gradient-mesh relative min-h-screen">
      <DemoStadiumBackground />
      <header className="sticky top-0 z-50 border-b border-white/5 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href={ROUTES.demo} className="rounded-lg p-2 text-muted-foreground transition hover:bg-white/5 hover:text-foreground">
              <ArrowLeft className="size-4" />
            </Link>
            <Link href={ROUTES.demo} className="flex items-center gap-2">
              <LiveCircuitLogo className="h-6" />
              <span className="hidden text-xs font-medium uppercase tracking-widest text-muted-foreground sm:inline">Interactive Demo</span>
            </Link>
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href) && item.href !== ROUTES.demo;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                    active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Link
            href={`${ROUTES.interactiveDemo}/finale`}
            className="rounded-full bg-gradient-to-r from-primary to-accent px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-primary/25 transition hover:opacity-90"
          >
            Join LiveCircuit
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-white/5 px-4 py-2 md:hidden">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href) && item.href !== ROUTES.demo;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
                  active ? "bg-primary/15 text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="size-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12"
      >
        {children}
      </motion.main>
    </div>
  );
}
