"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye } from "lucide-react";
import { ArenaBrandingMockups } from "@/components/demo/naming-rights/arena-branding-mockups";
import { ArenaHeroFull } from "@/components/demo/naming-rights/arena-hero-full";
import { AnimatedCounter } from "@/components/demo/naming-rights/animated-counter";
import { FadeUp } from "@/components/demo/naming-rights/fade-up";
import { InteractiveAnalyticsDashboard } from "@/components/demo/naming-rights/interactive-analytics-dashboard";
import { PersonalizedProposal } from "@/components/demo/naming-rights/personalized-proposal";
import { ArenaTierCards, RoiCalculator } from "@/components/demo/naming-rights/roi-calculator";
import { WhyLiveCircuit } from "@/components/demo/naming-rights/why-livecircuit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ARENA_HERO_STATS,
  ARENA_TIER_OPTIONS,
  DEFAULT_COMPANY,
  DEFAULT_STATE,
  EVENT_LISTINGS,
  INSIDE_ARENA_SECTIONS,
  LIVE_ARENA_STATS,
  US_STATES,
} from "@/lib/demo/naming-rights-data";
import {
  calculateRoi,
  formatCompact,
  getArenaName,
  getBrandTheme,
  getDisplayCompany,
  scaleStatsByTier,
} from "@/lib/demo/naming-rights-utils";

export function NamingRightsDemo() {
  const [companyName, setCompanyName] = useState(DEFAULT_COMPANY);
  const [state, setState] = useState(DEFAULT_STATE);
  const [tierId, setTierId] = useState("theater");
  const [monthlyBudget, setMonthlyBudget] = useState(16_500);
  const [contractMonths, setContractMonths] = useState(12);
  const previewRef = useRef<HTMLDivElement>(null);

  const displayCompany = getDisplayCompany(companyName);
  const arenaName = getArenaName(companyName);
  const theme = useMemo(() => getBrandTheme(displayCompany), [displayCompany]);
  const resetKey = `${displayCompany}-${tierId}`;

  const selectedTier = ARENA_TIER_OPTIONS.find((t) => t.id === tierId) ?? ARENA_TIER_OPTIONS[2];
  const heroStats = useMemo(() => scaleStatsByTier(ARENA_HERO_STATS, tierId), [tierId]);
  const liveStats = useMemo(() => scaleStatsByTier(LIVE_ARENA_STATS, tierId), [tierId]);
  const roi = calculateRoi({ monthlyBudget, contractMonths, tierId });

  useEffect(() => {
    setMonthlyBudget(selectedTier.investment);
  }, [selectedTier.investment]);

  function scrollToPreview() {
    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const mailBase = encodeURIComponent(displayCompany);

  return (
    <div className="gradient-mesh overflow-hidden">
      {/* §1 Hero */}
      <section className="relative mx-auto max-w-7xl px-4 pb-8 pt-16 sm:px-6 sm:pt-20">
        <div
          className="pointer-events-none absolute -top-24 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full blur-[100px]"
          style={{ background: theme.glow }}
        />
        <FadeUp className="relative mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="mb-6 border-amber-500/20 bg-amber-500/10 text-amber-400">
            Interactive Sponsorship Visualizer
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            See Your Brand{" "}
            <span className="text-gradient">Power the Future of Live Entertainment</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            Type your company name below and instantly experience what your sponsored LiveCircuit
            arena could look like.
          </p>

          <div className="mx-auto mt-10 max-w-xl space-y-4 text-left">
            <div className="space-y-2">
              <Label htmlFor="company" className="text-base">
                Company Name
              </Label>
              <Input
                id="company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Granite State Credit Union"
                className="h-14 border-white/15 bg-card/60 text-lg backdrop-blur-xl focus-visible:border-amber-500/50"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Select State</Label>
                <Select value={state} onValueChange={(v) => v && setState(v)}>
                  <SelectTrigger className="h-12 bg-card/60 backdrop-blur-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Arena Tier</Label>
                <Select value={tierId} onValueChange={(v) => v && setTierId(v)}>
                  <SelectTrigger className="h-12 bg-card/60 backdrop-blur-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ARENA_TIER_OPTIONS.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              type="button"
              size="lg"
              className="h-12 w-full text-base"
              onClick={scrollToPreview}
              style={{ background: theme.gradient }}
            >
              Visualize My Arena
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </FadeUp>
      </section>

      {/* §2 Arena Hero */}
      <div ref={previewRef} className="scroll-mt-4">
        <ArenaHeroFull
          arenaName={arenaName}
          companyName={displayCompany}
          state={state}
          theme={theme}
          stats={heroStats}
          resetKey={resetKey}
        />
      </div>

      {/* §3 Live Arena */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <FadeUp>
          <h2 className="text-3xl font-bold">Live arena activity</h2>
          <p className="mt-2 text-muted-foreground">Real-time demo metrics for {arenaName}.</p>
        </FadeUp>
        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-5">
          {liveStats.map((stat, i) => (
            <FadeUp key={stat.label} delay={i * 0.05}>
              <div className="glass-panel rounded-xl p-5 text-center transition hover:border-amber-500/20">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold">
                  <AnimatedCounter value={stat.value} format={stat.format} resetKey={resetKey} />
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* §4 Inside the Arena */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <FadeUp>
          <h2 className="text-3xl font-bold">Inside the arena</h2>
          <p className="mt-2 text-muted-foreground">Every sign displays your brand.</p>
        </FadeUp>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INSIDE_ARENA_SECTIONS.map((section, i) => (
            <FadeUp key={section.name} delay={i * 0.04}>
              <li className="glass-panel group rounded-xl p-5 transition hover:-translate-y-0.5 hover:border-amber-500/20">
                <span className="text-2xl">{section.icon}</span>
                <h3 className="mt-3 font-semibold">{section.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{section.capacity} capacity</p>
                <p className="mt-3 text-xs font-medium" style={{ color: theme.gold }}>
                  Presented by {displayCompany}
                </p>
              </li>
            </FadeUp>
          ))}
        </ul>
      </section>

      {/* §5 Upcoming Events */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <FadeUp className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Upcoming events</h2>
            <p className="mt-2 text-muted-foreground">Every card credits {displayCompany}.</p>
          </div>
          <Badge variant="outline" className="border-red-500/30 text-red-400">
            {EVENT_LISTINGS.length} events live
          </Badge>
        </FadeUp>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EVENT_LISTINGS.map((event, i) => (
            <FadeUp key={event.title} delay={i * 0.04}>
              <li
                className="glass-panel rounded-xl p-5 transition hover:border-primary/30"
                style={{ borderColor: `${theme.primary}15` }}
              >
                <div className="flex items-start justify-between">
                  <Badge variant="secondary" className="text-xs">{event.category}</Badge>
                  <span className="flex items-center gap-1 text-xs text-red-400">
                    <span className="size-1.5 rounded-full bg-red-500" /> LIVE
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{event.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{event.time}</p>
                <p className="mt-2 flex items-center gap-1 text-sm">
                  <Eye className="size-3.5" /> {event.viewers.toLocaleString()} watching
                </p>
                <p className="mt-3 border-t border-white/5 pt-3 text-xs" style={{ color: theme.gold }}>
                  Presented by {displayCompany}
                </p>
              </li>
            </FadeUp>
          ))}
        </ul>
      </section>

      {/* §6 Arena Branding */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <FadeUp>
          <h2 className="text-3xl font-bold">Arena branding</h2>
          <p className="mt-2 text-muted-foreground">
            Every touchpoint automatically branded for {displayCompany}.
          </p>
        </FadeUp>
        <div className="mt-10">
          <ArenaBrandingMockups companyName={displayCompany} arenaName={arenaName} theme={theme} />
        </div>
      </section>

      {/* §7 Sponsor Dashboard */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <FadeUp>
          <h2 className="text-3xl font-bold">Sponsor dashboard</h2>
          <p className="mt-2 text-muted-foreground">Analytics your team receives as an arena sponsor.</p>
        </FadeUp>
        <div className="mt-10">
          <InteractiveAnalyticsDashboard
            theme={theme}
            resetKey={resetKey}
            metrics={scaleStatsByTier(
              [
                { label: "Monthly Visitors", value: 182_000, format: "compact" as const },
                { label: "Brand Impressions", value: 1_800_000, format: "compact" as const },
                { label: "Ticket Sales", value: 24_800, format: "compact" as const },
                { label: "Ad Clicks", value: 48_200, format: "compact" as const },
                { label: "Average Attendance", value: 3_420, format: "number" as const },
                { label: "Live Viewers", value: 14_287, format: "number" as const },
              ],
              tierId
            )}
          />
        </div>
      </section>

      {/* §8 ROI Calculator */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <FadeUp>
          <h2 className="text-3xl font-bold">ROI calculator</h2>
          <p className="mt-2 text-muted-foreground">Adjust inputs — outputs update instantly.</p>
        </FadeUp>
        <div className="mt-10">
          <RoiCalculator
            monthlyBudget={monthlyBudget}
            contractMonths={contractMonths}
            tierId={tierId}
            onBudgetChange={setMonthlyBudget}
            onMonthsChange={setContractMonths}
            onTierChange={setTierId}
            theme={theme}
          />
        </div>
      </section>

      {/* §9 Available Arena Levels */}
      <section id="arena-tiers" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <FadeUp>
          <h2 className="text-3xl font-bold">Available arena levels</h2>
          <p className="mt-2 text-muted-foreground">From local businesses to national brands.</p>
        </FadeUp>
        <div className="mt-10">
          <ArenaTierCards />
        </div>
      </section>

      {/* §10 Personalized Proposal */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <FadeUp>
          <PersonalizedProposal
            companyName={displayCompany}
            arenaName={arenaName}
            tierName={selectedTier.name}
            estimatedReach={selectedTier.monthlyVisitors}
            brandExposure={`${formatCompact(roi.estimatedImpressions)} impressions / contract`}
            contractMonths={contractMonths}
            totalInvestment={roi.totalInvestment}
            theme={theme}
          />
        </FadeUp>
      </section>

      {/* §11 Why LiveCircuit */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <FadeUp>
          <h2 className="text-3xl font-bold">Why LiveCircuit</h2>
          <p className="mt-2 text-muted-foreground">The sponsorship platform built for the future of live entertainment.</p>
        </FadeUp>
        <div className="mt-10">
          <WhyLiveCircuit />
        </div>
      </section>

      {/* §12 Call To Action */}
      <section id="contact" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <FadeUp>
          <div
            className="relative overflow-hidden rounded-3xl border p-10 text-center sm:p-16"
            style={{
              borderColor: `${theme.gold}40`,
              background: `linear-gradient(135deg, ${theme.primary}15, oklch(0.14 0.025 280), ${theme.gold}08)`,
            }}
          >
            <h2 className="text-3xl font-bold sm:text-4xl">Ready to Put Your Name on an Arena?</h2>
            <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
              {displayCompany} × {arenaName} — let&apos;s build your LiveCircuit presence.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" className="h-12 px-8" href={`mailto:partners@livecircuit.com?subject=Schedule%20Demo%20-%20${mailBase}`}>
                Schedule a Demo
              </Button>
              <Button size="lg" variant="secondary" className="h-12 px-8" href={`mailto:partners@livecircuit.com?subject=Pricing%20Request%20-%20${mailBase}`}>
                Request Pricing
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8" href={`mailto:partners@livecircuit.com?subject=Reserve%20Arena%20-%20${mailBase}`}>
                Reserve This Arena
              </Button>
            </div>
            <p className="mt-8 text-sm text-muted-foreground">
              Demo only — no data is saved.{" "}
              <Link href="/sponsor" className="text-primary hover:underline">
                View live sponsorship platform →
              </Link>
            </p>
          </div>
        </FadeUp>
      </section>
    </div>
  );
}
