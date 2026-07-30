"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { US_STATE_MAP_POSITIONS, ABBR_TO_STATE_NAME } from "@/lib/sponsorship/program-constants";
import type { StateSponsorStats } from "@/lib/sponsorship/sponsor-map";
import { formatCents } from "@/lib/format";

export function LiveSponsorMap({ states }: { states: StateSponsorStats[] }) {
  const [selected, setSelected] = useState<StateSponsorStats | null>(null);
  const statsByAbbr = new Map(states.map((s) => [s.stateCode, s]));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="relative aspect-[1.6/1] min-h-[320px] overflow-hidden rounded-2xl border border-white/10 bg-[#0a1628]">
        <p className="absolute left-4 top-4 z-10 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Live sponsorship inventory · United States
        </p>
        {Object.entries(US_STATE_MAP_POSITIONS).map(([name, pos]) => {
          const stats = statsByAbbr.get(pos.abbr);
          const occupancy = stats?.occupancyPercent ?? 0;
          const hasData = Boolean(stats);
          return (
            <button
              key={name}
              type="button"
              title={`${name}${stats ? ` · ${occupancy}% occupied` : ""}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: hasData ? 12 + Math.min(occupancy / 5, 8) : 8,
                height: hasData ? 12 + Math.min(occupancy / 5, 8) : 8,
                backgroundColor: hasData
                  ? occupancy > 70
                    ? "rgba(234, 179, 8, 0.85)"
                    : occupancy > 30
                      ? "rgba(59, 130, 246, 0.75)"
                      : "rgba(16, 185, 129, 0.75)"
                  : "rgba(255,255,255,0.15)",
                borderColor: selected?.stateCode === pos.abbr ? "white" : "transparent",
              }}
              onClick={() => setSelected(stats ?? null)}
            />
          );
        })}
      </div>

      <aside className="glass-panel rounded-xl border border-white/10 p-5">
        {selected ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">{ABBR_TO_STATE_NAME[selected.stateCode] ?? selected.stateCode}</h3>
              <Badge variant="outline" className="mt-1">{selected.occupancyPercent}% occupancy</Badge>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-muted-foreground">Arenas</dt><dd className="font-semibold tabular-nums">{selected.arenaCount}</dd></div>
              <div><dt className="text-muted-foreground">Sold</dt><dd className="font-semibold tabular-nums">{selected.soldSponsorships}</dd></div>
              <div><dt className="text-muted-foreground">Available</dt><dd className="font-semibold tabular-nums">{selected.availableSponsorships}</dd></div>
              <div><dt className="text-muted-foreground">Revenue</dt><dd className="font-semibold tabular-nums">{formatCents(selected.revenueCents)}</dd></div>
            </dl>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Arenas</p>
              <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto text-sm">
                {selected.venues.map((v) => (
                  <li key={v.id} className="rounded-lg border border-white/10 p-2">
                    <Link href={`/livecircuit/venues/${v.slug}`} className="font-medium hover:text-primary">
                      {v.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {v.soldSlots}/{v.totalSlots} sold · {formatCents(v.revenueCents)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <Link href={`/sponsor/marketplace?state=${selected.stateCode}`} className="text-sm text-primary hover:underline">
              Browse {selected.stateCode} opportunities →
            </Link>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a state to view arena inventory, sold sponsorships, available slots, and revenue. Green = availability, blue = partial, gold = high demand.
          </p>
        )}
      </aside>
    </div>
  );
}
