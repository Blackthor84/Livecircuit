"use client";

import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSponsorVisualizer } from "@/components/demo/naming-rights/sponsor-visualizer-context";

export function WizardShell({
  children,
  onLaunchPresentation,
}: {
  children: React.ReactNode;
  onLaunchPresentation?: () => void;
}) {
  const { step, steps, nextStep, prevStep, canProceed, presentationMode, flyoverMode, phase } =
    useSponsorVisualizer();
  const current = steps.find((s) => s.id === step);
  const progress = (step / steps.length) * 100;

  if (phase === "intro" || presentationMode || flyoverMode) return <>{children}</>;

  return (
    <div className="relative min-h-[calc(100vh-9rem)]">
      <div className="sticky top-36 z-40 border-b border-white/5 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/90">
              Build Your Arena · Enterprise
            </p>
            <p className="truncate text-sm font-medium">{current?.title}</p>
          </div>
          <div className="flex items-center gap-2">
            {step >= 4 && onLaunchPresentation ? (
              <Button size="sm" variant="outline" onClick={onLaunchPresentation}>
                <Maximize2 className="size-4" />
                Presentation Mode
              </Button>
            ) : null}
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Step {step} of {steps.length}
            </span>
          </div>
        </div>
        <div className="h-0.5 bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-primary via-amber-500 to-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">{children}</div>

      {step > 1 && step < 12 ? (
        <div className="sticky bottom-0 z-40 border-t border-white/5 bg-background/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <Button variant="ghost" onClick={prevStep}>
              <ChevronLeft className="size-4" />
              Back
            </Button>
            {step !== 1 && step !== 2 ? (
              <Button onClick={nextStep} disabled={!canProceed(step)}>
                Continue
                <ChevronRight className="size-4" />
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Select an option to continue</p>
            )}
          </div>
        </div>
      ) : null}

      {(step === 12 || step === 13) && step < 14 ? (
        <div className="sticky bottom-0 z-40 border-t border-white/5 bg-background/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <Button variant="ghost" onClick={prevStep}>
              <ChevronLeft className="size-4" />
              Back
            </Button>
            {step < 14 ? (
              <Button onClick={nextStep}>
                Continue
                <ChevronRight className="size-4" />
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
