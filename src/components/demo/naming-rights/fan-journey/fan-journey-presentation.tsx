"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import { AnimatedCounter } from "@/components/demo/naming-rights/animated-counter";
import { FanJourneyBrandImpact } from "@/components/demo/naming-rights/fan-journey/fan-journey-brand-impact";
import { FanJourneyComparison } from "@/components/demo/naming-rights/fan-journey/fan-journey-comparison";
import { FanJourneyExecutiveInsight } from "@/components/demo/naming-rights/fan-journey/fan-journey-executive-insight";
import { FanJourneyStepMockups } from "@/components/demo/naming-rights/fan-journey/fan-journey-step-mockups";
import { SponsorBrandLogo } from "@/components/demo/naming-rights/sponsor-brand-logo";
import { useSponsorVisualizer } from "@/components/demo/naming-rights/sponsor-visualizer-context";
import { Button } from "@/components/ui/button";
import { FAN_JOURNEY_STEPS_V4 } from "@/lib/demo/fan-journey-data";
import { getFanJourneyStepMetrics } from "@/lib/demo/fan-journey-utils";
import { FAN_JOURNEY_PRESENTATION_SLIDE_COUNT } from "@/lib/demo/sponsor-visualizer-steps";
import { EVENT_TYPES } from "@/lib/demo/sponsor-visualizer-steps";

export function FanJourneyPresentation() {
  const {
    fanJourneyPresentationMode,
    fanJourneySlide,
    fanJourneyAutoplay,
    setFanJourneyAutoplay,
    exitFanJourneyPresentation,
    nextFanJourneySlide,
    prevFanJourneySlide,
    displayCompany,
    arenaName,
    theme,
    form,
    resetKey,
  } = useSponsorVisualizer();

  useEffect(() => {
    if (!fanJourneyPresentationMode) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") nextFanJourneySlide();
      if (e.key === "ArrowLeft") prevFanJourneySlide();
      if (e.key === "Escape") exitFanJourneyPresentation();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fanJourneyPresentationMode, nextFanJourneySlide, prevFanJourneySlide, exitFanJourneyPresentation]);

  if (!fanJourneyPresentationMode) return null;

  const eventLabel = EVENT_TYPES.find((e) => e.id === form.eventType)?.label ?? "Live Event";
  const stepCount = FAN_JOURNEY_STEPS_V4.length;
  const isBrandImpact = fanJourneySlide === stepCount;
  const isExecutive = fanJourneySlide === stepCount + 1;
  const isComparison = fanJourneySlide === stepCount + 2;
  const step = FAN_JOURNEY_STEPS_V4[fanJourneySlide];
  const metrics = step ? getFanJourneyStepMetrics(step.id, form.expectedAttendance, form.tierId) : null;
  const isDiscovery = step?.id === "discovery";

  return (
    <div className="fixed inset-0 z-[210] flex flex-col bg-black">
      <div className="absolute inset-0 opacity-40" style={{ background: theme.gradient }} />
      <div className="gradient-mesh absolute inset-0 opacity-60" />

      <div className="relative flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">Play Sponsor Story</p>
          <p className="text-sm text-muted-foreground">
            {displayCompany} · {arenaName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setFanJourneyAutoplay(!fanJourneyAutoplay)}>
            {fanJourneyAutoplay ? <Pause className="size-4" /> : <Play className="size-4" />}
            {fanJourneyAutoplay ? "Pause" : "Auto-play"}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={exitFanJourneyPresentation} aria-label="Exit">
            <X className="size-5" />
          </Button>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-y-auto px-4 py-8 sm:px-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={fanJourneySlide}
            className="mx-auto w-full max-w-5xl"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            {step ? (
              <div className="text-center">
                <motion.p
                  className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-400"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  Step {step.step} of {stepCount}
                </motion.p>
                <motion.h2
                  className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  {step.title}
                </motion.h2>
                <motion.p
                  className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {step.subtitle}
                </motion.p>

                <motion.div
                  className="mt-10"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 }}
                >
                  <FanJourneyStepMockups
                    compact
                    ctx={{
                      stepId: step.id,
                      companyName: displayCompany,
                      arenaName,
                      theme,
                      logoUrl: form.logoUrl,
                      eventLabel,
                    }}
                  />
                </motion.div>

                <motion.div
                  className="mt-8 flex flex-wrap items-center justify-center gap-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.85 }}
                >
                  <div className="text-center">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      {isDiscovery ? "Reach" : "Impressions"}
                    </p>
                    <p className="text-3xl font-bold tabular-nums" style={{ color: theme.gold }}>
                      <AnimatedCounter
                        value={isDiscovery ? metrics!.reach : metrics!.impressions}
                        resetKey={`${resetKey}-${fanJourneySlide}`}
                      />
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Engagement</p>
                    <p className="text-3xl font-bold tabular-nums" style={{ color: theme.gold }}>
                      <AnimatedCounter value={metrics!.engagement} resetKey={`${resetKey}-${fanJourneySlide}-eng`} />
                    </p>
                  </div>
                  {metrics!.clicks != null ? (
                    <div className="text-center">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">CTR</p>
                      <p className="text-3xl font-bold tabular-nums" style={{ color: theme.gold }}>
                        {metrics!.ctr}%
                      </p>
                    </div>
                  ) : null}
                  <SponsorBrandLogo theme={theme} logoUrl={form.logoUrl} size="md" />
                </motion.div>

                <motion.p
                  className="mx-auto mt-10 max-w-2xl rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm italic text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  &ldquo;{step.narrationPlaceholder}&rdquo;
                </motion.p>
              </div>
            ) : null}

            {isBrandImpact ? (
              <div>
                <h2 className="mb-8 text-center text-4xl font-bold sm:text-5xl">Your Brand Impact</h2>
                <FanJourneyBrandImpact compact />
              </div>
            ) : null}

            {isExecutive ? <FanJourneyExecutiveInsight compact /> : null}

            {isComparison ? <FanJourneyComparison compact /> : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative flex items-center justify-between border-t border-white/10 px-4 py-5 sm:px-6">
        <Button variant="outline" size="lg" onClick={prevFanJourneySlide} disabled={fanJourneySlide === 0}>
          <ChevronLeft className="size-5" />
          Previous
        </Button>
        <p className="text-sm text-muted-foreground">
          {fanJourneySlide + 1} / {FAN_JOURNEY_PRESENTATION_SLIDE_COUNT}
        </p>
        <Button
          size="lg"
          onClick={nextFanJourneySlide}
          disabled={fanJourneySlide >= FAN_JOURNEY_PRESENTATION_SLIDE_COUNT - 1}
        >
          Next
          <ChevronRight className="size-5" />
        </Button>
      </div>
    </div>
  );
}
