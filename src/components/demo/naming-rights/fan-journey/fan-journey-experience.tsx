"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { Play, TrendingUp, Users, Eye, Radio } from "lucide-react";
import { AnimatedCounter } from "@/components/demo/naming-rights/animated-counter";
import { FadeUp, FadeUpItem, FadeUpStagger } from "@/components/demo/naming-rights/fade-up";
import { FanJourneyBrandImpact } from "@/components/demo/naming-rights/fan-journey/fan-journey-brand-impact";
import { FanJourneyComparison } from "@/components/demo/naming-rights/fan-journey/fan-journey-comparison";
import { FanJourneyExecutiveInsight } from "@/components/demo/naming-rights/fan-journey/fan-journey-executive-insight";
import { FanJourneyStepMockups } from "@/components/demo/naming-rights/fan-journey/fan-journey-step-mockups";
import { SponsorBrandLogo } from "@/components/demo/naming-rights/sponsor-brand-logo";
import { useSponsorVisualizer } from "@/components/demo/naming-rights/sponsor-visualizer-context";
import { Button } from "@/components/ui/button";
import { FAN_JOURNEY_STEPS_V4 } from "@/lib/demo/fan-journey-data";
import { getFanJourneyStepMetrics, formatMetric } from "@/lib/demo/fan-journey-utils";
import { EVENT_TYPES } from "@/lib/demo/sponsor-visualizer-steps";
import { cn } from "@/lib/utils";

export function FanJourneyExperience({ compact }: { compact?: boolean }) {
  const {
    displayCompany,
    arenaName,
    theme,
    form,
    resetKey,
    enterFanJourneyPresentation,
  } = useSponsorVisualizer();
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventLabel = EVENT_TYPES.find((e) => e.id === form.eventType)?.label ?? "Live Event";

  return (
    <div className="space-y-16">
      {!compact ? (
        <FadeUp className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">The LiveCircuit Fan Journey</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Follow Your Customer&apos;s Journey</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Watch how your sponsorship reaches fans from the moment they discover an event until long after the show ends.
          </p>
          <Button size="lg" className="mt-8 h-12 gap-2 px-8" onClick={enterFanJourneyPresentation}>
            <Play className="size-4 fill-current" />
            Play Sponsor Story
          </Button>
        </FadeUp>
      ) : null}

      {/* Desktop: horizontal scroll journey */}
      <div className="hidden lg:block">
        <FadeUp>
          <div
            ref={scrollRef}
            className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {FAN_JOURNEY_STEPS_V4.map((step, i) => (
              <JourneyStepCard
                key={step.id}
                step={step}
                index={i}
                total={FAN_JOURNEY_STEPS_V4.length}
                displayCompany={displayCompany}
                arenaName={arenaName}
                theme={theme}
                form={form}
                resetKey={resetKey}
                eventLabel={eventLabel}
                horizontal
              />
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">Scroll horizontally to explore each touchpoint →</p>
        </FadeUp>
      </div>

      {/* Mobile: vertical timeline */}
      <div className="relative mx-auto max-w-5xl lg:hidden">
        <div className="absolute bottom-0 left-6 top-0 w-px bg-gradient-to-b from-primary/60 via-primary/20 to-transparent" />
        <FadeUpStagger className="space-y-8">
          {FAN_JOURNEY_STEPS_V4.map((step, i) => (
            <FadeUpItem key={step.id}>
              <JourneyStepCard
                step={step}
                index={i}
                total={FAN_JOURNEY_STEPS_V4.length}
                displayCompany={displayCompany}
                arenaName={arenaName}
                theme={theme}
                form={form}
                resetKey={resetKey}
                eventLabel={eventLabel}
              />
            </FadeUpItem>
          ))}
        </FadeUpStagger>
      </div>

      <FanJourneyBrandImpact compact={compact} />
      <FanJourneyExecutiveInsight compact={compact} />
      <FanJourneyComparison compact={compact} />
    </div>
  );
}

type StepDef = (typeof FAN_JOURNEY_STEPS_V4)[number];

function JourneyStepCard({
  step,
  index,
  total,
  displayCompany,
  arenaName,
  theme,
  form,
  resetKey,
  eventLabel,
  horizontal,
}: {
  step: StepDef;
  index: number;
  total: number;
  displayCompany: string;
  arenaName: string;
  theme: ReturnType<typeof useSponsorVisualizer>["theme"];
  form: ReturnType<typeof useSponsorVisualizer>["form"];
  resetKey: string;
  eventLabel: string;
  horizontal?: boolean;
}) {
  const metrics = getFanJourneyStepMetrics(step.id, form.expectedAttendance, form.tierId);
  const isDiscovery = step.id === "discovery";

  return (
    <motion.article
      className={cn(
        "relative",
        horizontal ? "min-w-[440px] max-w-[440px] shrink-0 snap-center" : "sm:pl-16"
      )}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: horizontal ? index * 0.03 : 0 }}
    >
      {!horizontal ? (
        <div
          className="absolute left-0 top-6 flex size-12 items-center justify-center rounded-2xl border border-primary/30 text-lg font-bold"
          style={{ background: `${theme.primary}22`, color: theme.primary }}
        >
          {step.step}
        </div>
      ) : null}

      {horizontal && index < total - 1 ? (
        <div className="absolute -right-3 top-1/2 z-10 hidden size-6 -translate-y-1/2 rounded-full border border-primary/40 bg-background lg:block">
          <div className="absolute left-full top-1/2 h-px w-6 -translate-y-1/2 bg-gradient-to-r from-primary/50 to-transparent" />
        </div>
      ) : null}

      <div className="glass-panel overflow-hidden rounded-3xl border border-white/10">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {horizontal ? (
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                  style={{ background: `${theme.primary}22`, color: theme.primary }}
                >
                  {step.step}
                </span>
              ) : (
                <span className="text-2xl">{step.icon}</span>
              )}
              <div>
                <h3 className="text-xl font-bold">{step.title}</h3>
                <p className="mt-0.5 text-sm text-amber-400/90">{step.subtitle}</p>
              </div>
            </div>
            <SponsorBrandLogo theme={theme} logoUrl={form.logoUrl} size="sm" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{step.description}</p>
          <p className="mt-2 text-xs font-medium" style={{ color: theme.gold }}>
            Presented by {displayCompany}
          </p>
        </div>

        <div className={cn("grid gap-5 p-5", !horizontal && "sm:p-6 lg:grid-cols-[1fr_240px]")}>
          <FanJourneyStepMockups
            compact={horizontal}
            ctx={{
              stepId: step.id,
              companyName: displayCompany,
              arenaName,
              theme,
              logoUrl: form.logoUrl,
              eventLabel,
            }}
          />

          <div className="space-y-3">
            <MetricCard
              icon={isDiscovery ? Radio : Eye}
              label={isDiscovery ? "Est. Reach" : "Est. Impressions"}
              value={isDiscovery ? metrics.reach : metrics.impressions}
              resetKey={resetKey}
              theme={theme}
            />
            <MetricCard icon={Users} label="Est. Engagement" value={metrics.engagement} resetKey={resetKey} theme={theme} />
            {metrics.clicks != null ? (
              <MetricCard
                icon={TrendingUp}
                label={isDiscovery ? `Est. Clicks · ${metrics.ctr}% CTR` : `Clicks · ${metrics.ctr}% CTR`}
                value={metrics.clicks}
                resetKey={resetKey}
                theme={theme}
              />
            ) : null}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-emerald-400">Business Value</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{step.businessValue}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  resetKey,
  theme,
}: {
  icon: typeof Eye;
  label: string;
  value: number;
  resetKey: string;
  theme: { primary: string; gold: string };
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3" style={{ color: theme.primary }} />
        <p className="text-[9px] font-semibold uppercase tracking-widest">{label}</p>
      </div>
      <p className="mt-1.5 text-xl font-bold tabular-nums" style={{ color: theme.gold }}>
        <AnimatedCounter value={value} resetKey={resetKey} />
      </p>
      <p className="text-[9px] text-muted-foreground">{formatMetric(value)}</p>
    </div>
  );
}
