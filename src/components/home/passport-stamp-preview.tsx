"use client";

import Link from "next/link";
import { ArrowRight, Stamp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

/** Homepage preview of fan passport city stamps. */
export function PassportStampPreview({ stamps }: { stamps: string[] }) {
  return (
    <div className="glass-panel rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5 p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <Stamp className="size-5 text-primary" />
        <p className="text-sm font-medium uppercase tracking-wide text-primary">Your digital passport</p>
      </div>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        Collect a stamp for every city you attend. Complete states, countries, and world tours as artists travel
        the globe.
      </p>
      <ul className="mt-6 flex flex-wrap gap-3">
        {stamps.map((city) => (
          <li
            key={city}
            className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-200"
          >
            <span className="text-emerald-400">✓</span>
            {city}
          </li>
        ))}
        <li className="flex items-center rounded-lg border border-dashed border-white/20 px-3 py-2 text-sm text-muted-foreground">
          + more cities
        </li>
      </ul>
      <Button className="mt-6" href={ROUTES.passport}>
        Start collecting stamps
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
