"use client";

import { Download } from "lucide-react";
import { useSuccessCenter } from "@/components/artists/success-center/success-center-context";
import { getFitScoreColorClasses } from "@/lib/demo/artist-success-center-utils";
import { AnimatedCounter } from "@/components/demo/naming-rights/animated-counter";
import { FadeUp } from "@/components/demo/naming-rights/fade-up";
import { SectionHeader } from "@/components/artists/success-center/section-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ArtistReportSection() {
  const { report, multiScores } = useSuccessCenter();
  const colors = getFitScoreColorClasses(multiScores.audienceFit.color);
  const resetKey = String(report.audienceFitScore);

  return (
    <section id="artist-report" className="scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <SectionHeader eyebrow="Step 13" title="Personalized Success Report"
          description="Your custom Artist Success Report — generated from your profile above." />

        <FadeUp>
          <div className="glass-panel overflow-hidden rounded-3xl border-primary/25">
            <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-primary/10 to-transparent px-6 py-5">
              <div>
                <p className="font-semibold">Artist Success Report</p>
                <p className="text-xs text-muted-foreground">Demo · personalized to your inputs</p>
              </div>
              <Button size="sm" variant="outline" disabled className="gap-2 opacity-60">
                <Download className="size-3.5" />
                Download (coming soon)
              </Button>
            </div>

            <div className="grid gap-px bg-white/5 sm:grid-cols-2">
              {[
                { label: "Audience Fit Score", value: report.audienceFitScore, suffix: `/100 · ${report.fitLabel}`, highlight: true },
                { label: "Venue Recommendation", text: report.recommendedVenue },
                { label: "Recommended Ticket Price", text: `$${report.recommendedTicketPrice}` },
                { label: "Estimated Attendance", value: report.expectedAttendance },
                { label: "Estimated Revenue", value: report.estimatedRevenue, prefix: "$", highlight: true },
                { label: "Growth Plan", text: report.growthPlan },
              ].map((item) => (
                <div key={item.label} className="bg-card/40 p-6">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  {item.value !== undefined ? (
                    <p className={cn("mt-2 text-2xl font-bold tabular-nums", item.highlight && colors.text)}>
                      {item.prefix ?? ""}
                      <AnimatedCounter value={item.value} format="number" resetKey={resetKey} />
                      {item.suffix ?? ""}
                    </p>
                  ) : (
                    <p className="mt-2 font-medium">{item.text}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="grid gap-6 p-6 sm:grid-cols-3">
              <div>
                <p className="text-sm font-semibold text-emerald-400">Strengths</p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {report.strengths.map((s) => (<li key={s} className="flex gap-2"><span className="text-emerald-400">✓</span>{s}</li>))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-400">Improvement Opportunities</p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {report.improvements.map((s) => (<li key={s} className="flex gap-2"><span className="text-amber-400">→</span>{s}</li>))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">Next Steps</p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {report.nextSteps.map((s) => (<li key={s} className="flex gap-2"><span className="text-primary">1.</span>{s}</li>))}
                </ul>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
