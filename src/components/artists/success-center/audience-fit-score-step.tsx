"use client";

import { useSuccessCenter } from "@/components/artists/success-center/success-center-context";
import { ScoreCard } from "@/components/artists/success-center/score-card";
import { FadeUp } from "@/components/demo/naming-rights/fade-up";
import { SectionHeader } from "@/components/artists/success-center/section-header";

export function AudienceFitScoreStep() {
  const { multiScores, activeAudience } = useSuccessCenter();
  const resetKey = String(activeAudience);

  return (
    <section id="audience-fit" className="scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <SectionHeader eyebrow="Step 3" title="Audience Fit Score"
          description="Four scores that explain your readiness — and why each was earned." />

        <div className="grid gap-6 sm:grid-cols-2">
          <FadeUp><ScoreCard title="Audience Fit Score" score={multiScores.audienceFit} resetKey={resetKey} /></FadeUp>
          <FadeUp delay={0.06}><ScoreCard title="Venue Readiness Score" score={multiScores.venueReadiness} resetKey={resetKey} /></FadeUp>
          <FadeUp delay={0.12}><ScoreCard title="Pricing Confidence Score" score={multiScores.pricingConfidence} resetKey={resetKey} /></FadeUp>
          <FadeUp delay={0.18}><ScoreCard title="Growth Score" score={multiScores.growth} resetKey={resetKey} /></FadeUp>
        </div>
      </div>
    </section>
  );
}
