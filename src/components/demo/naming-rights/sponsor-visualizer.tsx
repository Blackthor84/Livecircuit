"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CinematicLanding } from "@/components/demo/naming-rights/cinematic-landing";
import { ExecutiveFlyover } from "@/components/demo/naming-rights/executive-flyover";
import { FanJourneyPresentation } from "@/components/demo/naming-rights/fan-journey/fan-journey-presentation";
import { PresentationMode } from "@/components/demo/naming-rights/presentation-mode";
import { SponsorVisualizerProvider, useSponsorVisualizer } from "@/components/demo/naming-rights/sponsor-visualizer-context";
import { StepContent } from "@/components/demo/naming-rights/step-content";
import { WizardShell } from "@/components/demo/naming-rights/wizard-shell";

function SponsorVisualizerInner() {
  const { phase, step, theme, enterPresentation } = useSponsorVisualizer();

  if (phase === "intro") {
    return <CinematicLanding />;
  }

  return (
    <>
      <div className="gradient-mesh min-h-screen overflow-hidden" style={{ ["--sv-glow" as string]: theme.glow }}>
        <WizardShell onLaunchPresentation={enterPresentation}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <StepContent stepId={step} />
            </motion.div>
          </AnimatePresence>
        </WizardShell>
      </div>
      <PresentationMode />
      <FanJourneyPresentation />
      <ExecutiveFlyover />
    </>
  );
}

export function SponsorVisualizer({ pricing }: { pricing?: import("@/lib/monetization/sponsor-pricing-types").SponsorPricingBundle }) {
  return (
    <SponsorVisualizerProvider pricing={pricing}>
      <SponsorVisualizerInner />
    </SponsorVisualizerProvider>
  );
}

export function NamingRightsDemo() {
  return <SponsorVisualizer />;
}
