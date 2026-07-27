"use client";

import { Sparkles } from "lucide-react";
import { FadeUp } from "@/components/demo/naming-rights/fade-up";
import { SponsorBrandLogo } from "@/components/demo/naming-rights/sponsor-brand-logo";
import { useSponsorVisualizer } from "@/components/demo/naming-rights/sponsor-visualizer-context";
import { cn } from "@/lib/utils";

export function FanJourneyExecutiveInsight({ compact }: { compact?: boolean }) {
  const { displayCompany, arenaName, theme, form } = useSponsorVisualizer();

  return (
    <FadeUp>
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl border border-white/10 p-8 sm:p-12",
          compact && "p-6 sm:p-8"
        )}
        style={{
          background: `linear-gradient(135deg, ${theme.primary}18 0%, oklch(0.12 0.02 280 / 0.9) 50%, ${theme.secondary}12 100%)`,
        }}
      >
        <div
          className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full opacity-30 blur-3xl"
          style={{ background: theme.glow }}
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
          <div className="shrink-0">
            <SponsorBrandLogo theme={theme} logoUrl={form.logoUrl} size="lg" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-amber-400">
              <Sparkles className="size-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em]">Executive Summary</p>
            </div>
            <h3
              className={cn(
                "mt-3 font-bold tracking-tight",
                compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl lg:text-5xl"
              )}
            >
              One Sponsorship.
              <br />
              <span className="text-foreground">Thousands of Events.</span>
              <br />
              <span style={{ color: theme.gold }}>Millions of Brand Moments.</span>
            </h3>
            <p
              className={cn(
                "mt-4 max-w-3xl text-muted-foreground",
                compact ? "text-sm" : "text-base sm:text-lg leading-relaxed"
              )}
            >
              Unlike traditional arena naming rights that reach fans only when they physically arrive at a venue,{" "}
              <strong className="text-foreground">LiveCircuit</strong> integrates{" "}
              <strong className="text-foreground">{displayCompany}</strong> throughout the complete digital
              experience — from discovery and ticket purchase to livestreams, interactive chat, social sharing, and
              repeat visits at <strong className="text-foreground">{arenaName}</strong>.
            </p>
          </div>
        </div>
      </div>
    </FadeUp>
  );
}
