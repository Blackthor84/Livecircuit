"use client";

import { useMemo, useState } from "react";
import { Check, MapPin, Search } from "lucide-react";
import { useSponsorVisualizer } from "@/components/demo/naming-rights/sponsor-visualizer-context";
import { Input } from "@/components/ui/input";
import { US_STATES } from "@/lib/demo/naming-rights-data";
import { formatCompact, getStateMarketData } from "@/lib/demo/naming-rights-utils";
import { STATE_POPULATIONS } from "@/lib/demo/state-market-data";
import { STATE_MAP_POSITIONS } from "@/lib/demo/sponsor-visualizer-steps";
import { cn } from "@/lib/utils";

export function UsStateSelector() {
  const { form, updateForm, stateMarket, setStep } = useSponsorVisualizer();
  const [query, setQuery] = useState("");
  const [hovered, setHovered] = useState<string | null>(null);

  const filtered = useMemo(
    () => US_STATES.filter((s) => s.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  function selectState(state: string) {
    updateForm({ state });
    setQuery("");
    setTimeout(() => setStep(2), 400);
  }

  const preview = hovered
    ? getStateMarketData(hovered, STATE_POPULATIONS[hovered] ?? 1_000_000)
    : stateMarket;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <div className="glass-panel relative aspect-[16/10] overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-amber-500/5" />
        {US_STATES.map((state) => {
          const pos = STATE_MAP_POSITIONS[state];
          if (!pos) return null;
          const selected = form.state === state;
          const isHovered = hovered === state;
          return (
            <button
              key={state}
              type="button"
              title={state}
              onMouseEnter={() => setHovered(state)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => selectState(state)}
              className={cn(
                "absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border font-bold transition-all duration-300",
                selected
                  ? "z-10 size-9 border-amber-400 bg-amber-500 text-black shadow-lg shadow-amber-500/50 sm:size-10"
                  : isHovered
                    ? "z-10 size-8 border-primary bg-primary/30 sm:size-9"
                    : "size-7 border-white/20 bg-card/80 text-[10px] hover:scale-110 sm:size-8 sm:text-[11px]"
              )}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              {pos.abbr}
            </button>
          );
        })}
      </div>

      <div className="space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search states..."
            className="h-12 bg-card/60 pl-10"
          />
        </div>
        {query ? (
          <ul className="glass-panel max-h-48 overflow-y-auto rounded-xl p-2">
            {filtered.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => selectState(s)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5"
                >
                  {form.state === s ? <Check className="size-4 text-primary" /> : <span className="size-4" />}
                  {s}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center gap-2 text-amber-400">
            <MapPin className="size-4" />
            <p className="font-semibold">{preview.state}</p>
          </div>
          <dl className="mt-5 space-y-4 text-sm">
            {[
              { label: "Population", value: formatCompact(preview.population) },
              { label: "Est. annual visitors", value: formatCompact(preview.annualVisitors) },
              { label: "Available venues", value: preview.venues.toString() },
              { label: "Economic region", value: preview.economicRegion },
              { label: "Sponsorship availability", value: `${preview.sponsorshipOpportunities} open` },
            ].map((row) => (
              <div key={row.label} className="flex justify-between gap-4 border-b border-white/5 pb-3">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="font-semibold">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
