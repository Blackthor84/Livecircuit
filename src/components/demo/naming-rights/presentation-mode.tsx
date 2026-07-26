"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSponsorVisualizer } from "@/components/demo/naming-rights/sponsor-visualizer-context";
import { StepContent } from "@/components/demo/naming-rights/step-content";
import { SPONSOR_VISUALIZER_STEPS } from "@/lib/demo/sponsor-visualizer-steps";

export function PresentationMode() {
  const {
    presentationMode,
    presentationSlide,
    presentationSlides,
    presentationAutoplay,
    setPresentationAutoplay,
    exitPresentation,
    nextPresentationSlide,
    prevPresentationSlide,
    displayCompany,
  } = useSponsorVisualizer();

  useEffect(() => {
    if (!presentationMode) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") nextPresentationSlide();
      if (e.key === "ArrowLeft") prevPresentationSlide();
      if (e.key === "Escape") exitPresentation();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presentationMode, nextPresentationSlide, prevPresentationSlide, exitPresentation]);

  if (!presentationMode) return null;

  const slideStepId = presentationSlides[presentationSlide];
  const slideMeta = SPONSOR_VISUALIZER_STEPS.find((s) => s.id === slideStepId);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
            Presentation Mode
          </p>
          <p className="text-sm text-muted-foreground">
            {displayCompany} · {slideMeta?.title}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPresentationAutoplay(!presentationAutoplay)}
          >
            {presentationAutoplay ? <Pause className="size-4" /> : <Play className="size-4" />}
            {presentationAutoplay ? "Pause" : "Auto-play"}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={exitPresentation} aria-label="Exit">
            <X className="size-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-10 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <StepContent stepId={slideStepId} presentation />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 px-4 py-5 sm:px-6">
        <Button variant="outline" size="lg" onClick={prevPresentationSlide} disabled={presentationSlide === 0}>
          <ChevronLeft className="size-5" />
          Previous
        </Button>
        <p className="text-sm text-muted-foreground">
          {presentationSlide + 1} / {presentationSlides.length}
        </p>
        <Button size="lg" onClick={nextPresentationSlide} disabled={presentationSlide >= presentationSlides.length - 1}>
          Next
          <ChevronRight className="size-5" />
        </Button>
      </div>
    </div>
  );
}
