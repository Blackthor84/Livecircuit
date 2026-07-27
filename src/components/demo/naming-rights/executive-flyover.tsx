"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Play, X } from "lucide-react";
import { useSponsorVisualizer } from "@/components/demo/naming-rights/sponsor-visualizer-context";
import { Button } from "@/components/ui/button";
import { FLYOVER_SCENE_IDS, type FlyoverSceneId } from "@/lib/demo/sponsor-visualizer-steps";

const FLYOVER_LABELS: Record<FlyoverSceneId, string> = {
  "search-discover": "Fan discovers arena in search results",
  "arena-homepage": "Arena homepage with sponsor hero",
  "event-listing": "Event listings show presenting sponsor",
  "digital-tickets": "Digital tickets with brand placement",
  "virtual-lobby": "Virtual lobby pre-show experience",
  livestream: "Livestream overlay during the show",
  "stage-led": "Stage LED screens & broadcast graphics",
  "chat-vip": "Chat branding & VIP lounge",
  "mobile-app": "Mobile app sponsor surfaces",
  "post-show": "Post-show email, push & profile frames",
  analytics: "Executive analytics dashboard",
  proposal: "Personalized sponsorship proposal",
  closing: "Closing opportunity",
};

export function ExecutiveFlyover() {
  const {
    flyoverMode,
    flyoverScene,
    exitFlyover,
    nextFlyoverScene,
    prevFlyoverScene,
    displayCompany,
    arenaName,
    theme,
    form,
  } = useSponsorVisualizer();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!flyoverMode) return;
    const timer = window.setInterval(nextFlyoverScene, 5000);
    return () => window.clearInterval(timer);
  }, [flyoverMode, nextFlyoverScene]);

  useEffect(() => {
    if (!flyoverMode) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") nextFlyoverScene();
      if (e.key === "ArrowLeft") prevFlyoverScene();
      if (e.key === "Escape") exitFlyover();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flyoverMode, nextFlyoverScene, prevFlyoverScene, exitFlyover]);

  if (!flyoverMode) return null;

  const sceneId = FLYOVER_SCENE_IDS[flyoverScene];

  return (
    <div className="fixed inset-0 z-[210] flex flex-col bg-black">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <p className="text-sm text-amber-400">Executive Flyover · {displayCompany}</p>
        <Button variant="ghost" size="icon-sm" onClick={exitFlyover} aria-label="Exit flyover">
          <X className="size-5" />
        </Button>
      </div>

      <div ref={scrollRef} className="relative flex flex-1 items-center justify-center overflow-hidden p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={sceneId}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl text-center"
          >
            <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground">
              Scene {flyoverScene + 1} / {FLYOVER_SCENE_IDS.length}
            </p>
            <h2 className="mt-6 text-4xl font-bold sm:text-6xl">{FLYOVER_LABELS[sceneId]}</h2>
            <p className="mx-auto mt-6 max-w-lg text-lg text-muted-foreground">
              {arenaName} · {form.state} · {form.timeOfDay === "night" ? "Night experience" : "Day experience"}
            </p>
            <div
              className="mx-auto mt-12 h-48 max-w-md rounded-2xl border"
              style={{
                borderColor: `${theme.primary}55`,
                background: `radial-gradient(ellipse at center, ${theme.glow}, transparent 70%)`,
                boxShadow: form.timeOfDay === "night" ? `0 0 80px ${theme.glow}` : undefined,
              }}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 px-4 py-4">
        <Button variant="outline" onClick={prevFlyoverScene} disabled={flyoverScene === 0}>
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <Button variant="ghost" size="sm" onClick={nextFlyoverScene}>
          <Play className="size-4" />
          Auto-advance
        </Button>
        <Button onClick={nextFlyoverScene} disabled={flyoverScene >= FLYOVER_SCENE_IDS.length - 1}>
          Next
        </Button>
      </div>
    </div>
  );
}
