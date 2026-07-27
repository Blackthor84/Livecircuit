"use client";

import { ARTIST_VENUE_GUIDES, VENUE_COMPARE_PRESETS, type ArtistVenueId } from "@/lib/demo/artist-success-center-data";
import { useSuccessCenter } from "@/components/artists/success-center/success-center-context";
import { FadeUp } from "@/components/demo/naming-rights/fade-up";
import { cn } from "@/lib/utils";

const COMPARE_ROWS: { key: keyof (typeof ARTIST_VENUE_GUIDES)[number]; label: string }[] = [
  { key: "capacity", label: "Capacity" },
  { key: "typicalAttendance", label: "Avg. Attendance" },
  { key: "typicalTicketPrices", label: "Ticket Range" },
  { key: "recommendedPerformer", label: "Recommended Performer" },
  { key: "productionLevel", label: "Production Level" },
  { key: "atmosphere", label: "Atmosphere" },
  { key: "riskLevel", label: "Risk Level" },
  { key: "growthPotential", label: "Growth Potential" },
];

function formatVenueValue(value: string | number): string {
  return typeof value === "number" ? value.toLocaleString() : value;
}

export function VenueComparePanel({ embedded }: { embedded?: boolean }) {
  const { compareVenueA, compareVenueB, setCompareVenueA, setCompareVenueB } = useSuccessCenter();
  const venueA = ARTIST_VENUE_GUIDES.find((v) => v.id === compareVenueA)!;
  const venueB = ARTIST_VENUE_GUIDES.find((v) => v.id === compareVenueB)!;

  const content = (
    <>
      <div className="mb-6 flex flex-wrap gap-2">
        {VENUE_COMPARE_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => {
              setCompareVenueA(preset.a);
              setCompareVenueB(preset.b);
            }}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition",
              compareVenueA === preset.a && compareVenueB === preset.b
                ? "border-primary bg-primary/15 text-primary"
                : "border-white/10 hover:border-white/20"
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        {[
          { label: "Venue A", value: compareVenueA, set: setCompareVenueA },
          { label: "Venue B", value: compareVenueB, set: setCompareVenueB },
        ].map((sel) => (
          <div key={sel.label}>
            <label className="mb-1 block text-xs text-muted-foreground">{sel.label}</label>
            <select
              value={sel.value}
              onChange={(e) => sel.set(e.target.value as ArtistVenueId)}
              className="w-full rounded-xl border border-white/10 bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
            >
              {ARTIST_VENUE_GUIDES.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="glass-panel overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="p-4 text-left text-muted-foreground">Metric</th>
              <th className="p-4 text-left font-semibold text-violet-300">{venueA.name}</th>
              <th className="p-4 text-left font-semibold text-emerald-300">{venueB.name}</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((row) => (
              <tr key={row.label} className="border-b border-white/5 last:border-0">
                <td className="p-4 text-muted-foreground">{row.label}</td>
                <td className="p-4 font-medium">{formatVenueValue(venueA[row.key] as string | number)}</td>
                <td className="p-4 font-medium">{formatVenueValue(venueB[row.key] as string | number)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  if (embedded) return content;

  return (
    <section id="venue-compare" className="scroll-mt-24 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <FadeUp>
          <h3 className="mb-2 text-xl font-bold">Compare Two Venues</h3>
          <p className="mb-6 text-sm text-muted-foreground">Side-by-side comparison to inform your booking decision.</p>
          {content}
        </FadeUp>
      </div>
    </section>
  );
}
