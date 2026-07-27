"use client";

import { Monitor, X } from "lucide-react";
import { useSuccessCenter } from "@/components/artists/success-center/success-center-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SuccessCenterToolbar() {
  const { presentationMode, setPresentationMode } = useSuccessCenter();

  if (presentationMode) return null;

  return (
    <div className="sticky top-16 z-40 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
        <p className="hidden text-xs text-muted-foreground sm:block">
          Enterprise Artist Advisor · Demo data only
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setPresentationMode(true)}
          className="ml-auto gap-2"
        >
          <Monitor className="size-3.5" />
          Presentation Mode
        </Button>
      </div>
    </div>
  );
}

export function PresentationOverlay() {
  const {
    presentationMode,
    setPresentationMode,
    presentationStep,
    setPresentationStep,
  } = useSuccessCenter();

  const steps = [
    "performer-type",
    "audience-profile",
    "audience-fit",
    "venue-match",
    "venue-comparison",
    "pricing-advisor",
    "show-simulator",
    "growth-roadmap",
    "fee-guide",
    "sell-more",
    "revenue-timeline",
    "faq",
    "artist-report",
    "dashboard-preview",
    "ready-to-book",
  ];

  if (!presentationMode) return null;

  function goToStep(index: number) {
    setPresentationStep(index);
    document.getElementById(steps[index])?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Button size="sm" variant="ghost" onClick={() => setPresentationMode(false)} className="gap-2">
          <X className="size-4" />
          Exit
        </Button>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={presentationStep <= 0} onClick={() => goToStep(presentationStep - 1)}>
            Prev
          </Button>
          <span className="text-sm tabular-nums text-muted-foreground">
            {presentationStep + 1} / {steps.length}
          </span>
          <Button size="sm" disabled={presentationStep >= steps.length - 1} onClick={() => goToStep(presentationStep + 1)}>
            Next
          </Button>
        </div>
        <div className="hidden gap-1 sm:flex">
          {steps.map((_, i) => (
            <button
              key={steps[i]}
              type="button"
              onClick={() => goToStep(i)}
              className={cn(
                "size-2 rounded-full transition",
                i === presentationStep ? "bg-primary" : "bg-white/20 hover:bg-white/40"
              )}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
