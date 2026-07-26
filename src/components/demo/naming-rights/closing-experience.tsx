"use client";

import { Calendar, DollarSign } from "lucide-react";
import { useSponsorVisualizer } from "@/components/demo/naming-rights/sponsor-visualizer-context";
import { Button } from "@/components/ui/button";
import { FadeUp } from "@/components/demo/naming-rights/fade-up";

export function ClosingExperience() {
  const { displayCompany, arenaName, theme } = useSponsorVisualizer();
  const mailBase = encodeURIComponent(displayCompany);

  return (
    <FadeUp>
      <div
        className="relative overflow-hidden rounded-3xl border p-12 text-center sm:p-20"
        style={{
          borderColor: `${theme.gold}40`,
          background: `linear-gradient(135deg, ${theme.primary}18, oklch(0.1 0.02 280), ${theme.gold}10)`,
        }}
      >
        <GlowBackdrop />
        <h2 className="relative text-4xl font-bold tracking-tight sm:text-6xl">
          Your Brand.
          <span className="mt-2 block">Every Event. Every Fan. Every Day.</span>
        </h2>
        <p className="relative mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Own more than a name. Own the experience.
        </p>
        <p className="relative mt-2 text-sm text-muted-foreground">
          {displayCompany} × {arenaName}
        </p>
        <div className="relative mt-12 flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" className="h-12 px-8" href={`mailto:partners@livecircuit.com?subject=Schedule%20Sponsorship%20Meeting%20-%20${mailBase}`}>
            <Calendar className="size-4" />
            Schedule Sponsorship Meeting
          </Button>
          <Button size="lg" variant="secondary" className="h-12 px-8" href={`mailto:partners@livecircuit.com?subject=Reserve%20Venue%20-%20${mailBase}`}>
            Reserve This Venue
          </Button>
          <Button size="lg" variant="outline" className="h-12 px-8" href={`mailto:partners@livecircuit.com?subject=Pricing%20Request%20-%20${mailBase}`}>
            <DollarSign className="size-4" />
            Request Pricing
          </Button>
        </div>
      </div>
    </FadeUp>
  );
}

function GlowBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-1/4 top-0 h-full w-1/2 bg-primary/10 blur-[100px]" />
      <div className="absolute -right-1/4 bottom-0 h-full w-1/2 bg-amber-500/10 blur-[100px]" />
    </div>
  );
}
