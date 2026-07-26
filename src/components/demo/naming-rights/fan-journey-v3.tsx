"use client";

import {
  ArrowRight,
  Calendar,
  MousePointerClick,
  Repeat,
  Search,
  Share2,
  Sparkles,
  Ticket,
  Building2,
} from "lucide-react";
import { FadeUp, FadeUpItem, FadeUpStagger } from "@/components/demo/naming-rights/fade-up";
import { SponsorBrandLogo } from "@/components/demo/naming-rights/sponsor-brand-logo";
import { useSponsorVisualizer } from "@/components/demo/naming-rights/sponsor-visualizer-context";
import { FAN_JOURNEY_STEPS } from "@/lib/demo/sponsor-visualizer-steps";

const ICONS = {
  search: Search,
  click: MousePointerClick,
  venue: Building2,
  ticket: Ticket,
  enter: ArrowRight,
  sponsor: Sparkles,
  event: Calendar,
  social: Share2,
  return: Repeat,
};

export function FanJourneyV3() {
  const { displayCompany, arenaName, theme, form } = useSponsorVisualizer();

  return (
    <FadeUpStagger className="mx-auto max-w-2xl space-y-4">
      {FAN_JOURNEY_STEPS.map((step, i) => {
        const Icon = ICONS[step.icon];
        return (
          <FadeUpItem key={step.label}>
            <div className="relative">
              {i < FAN_JOURNEY_STEPS.length - 1 ? (
                <div className="absolute left-6 top-14 h-[calc(100%+0.5rem)] w-px bg-gradient-to-b from-primary/50 to-transparent" />
              ) : null}
              <div className="glass-panel flex items-start gap-4 rounded-2xl p-5 transition hover:border-amber-500/25">
                <div
                  className="flex size-12 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `${theme.primary}22`, color: theme.primary }}
                >
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{step.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {step.label.includes("Search")
                      ? `"${displayCompany} LiveCircuit arena ${form.state}"`
                      : step.label.includes("Visits")
                        ? arenaName
                        : `Branded touchpoint · ${displayCompany}`}
                  </p>
                </div>
                <SponsorBrandLogo theme={theme} logoUrl={form.logoUrl} size="sm" />
              </div>
            </div>
          </FadeUpItem>
        );
      })}
    </FadeUpStagger>
  );
}
