"use client";

import { AUDIENCE_PLATFORMS } from "@/lib/demo/artist-success-center-data";
import { useSuccessCenter } from "@/components/artists/success-center/success-center-context";
import { AnimatedCounter } from "@/components/demo/naming-rights/animated-counter";
import { FadeUp } from "@/components/demo/naming-rights/fade-up";
import { SectionHeader } from "@/components/artists/success-center/section-header";

export function AudienceBuilderStep() {
  const { audience, updateAudience, activeAudience } = useSuccessCenter();

  const sliders = [
    ...AUDIENCE_PLATFORMS.map((p) => ({
      key: p.id as keyof typeof audience,
      label: p.label,
      icon: p.icon,
      max: p.id === "emailList" ? 50000 : 500000,
      step: p.id === "emailList" ? 50 : 100,
    })),
    { key: "pastAverageAttendance" as const, label: "Average Past Attendance", icon: "🎟️", max: 10000, step: 10 },
    { key: "averageTicketPrice" as const, label: "Average Ticket Price", icon: "💵", max: 200, step: 1 },
    { key: "yearsPerforming" as const, label: "Years Performing", icon: "📅", max: 30, step: 1 },
  ];

  return (
    <section id="audience-profile" className="scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <SectionHeader eyebrow="Step 2" title="Audience Profile"
          description="Build your audience profile — we'll calculate your estimated active fanbase." />

        <FadeUp>
          <div className="glass-panel space-y-6 rounded-3xl p-6 sm:p-8">
            {sliders.map((field) => (
              <fieldset key={field.key}>
                <legend className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <span>{field.icon}</span>
                  {field.label}:{" "}
                  <span className="text-primary">
                    {field.key === "averageTicketPrice" ? `$${audience[field.key]}` : audience[field.key].toLocaleString()}
                  </span>
                </legend>
                <input type="range" min={field.key === "yearsPerforming" ? 0 : 0} max={field.max} step={field.step}
                  value={audience[field.key]} onChange={(e) => updateAudience(field.key, Number(e.target.value))}
                  className="w-full accent-primary" />
              </fieldset>
            ))}
          </div>
        </FadeUp>

        <FadeUp delay={0.1} className="mt-8">
          <div className="glass-panel rounded-3xl border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-transparent p-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-400">Estimated Active Fanbase</p>
            <p className="mt-3 text-5xl font-bold tabular-nums text-emerald-300">
              <AnimatedCounter value={activeAudience} format="number" resetKey={String(activeAudience)} />
            </p>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
