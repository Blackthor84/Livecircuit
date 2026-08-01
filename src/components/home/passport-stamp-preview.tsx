"use client";

import { ArrowRight, Stamp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { HOMEPAGE_EMPTY_STATES } from "@/lib/home/empty-states";

/** Homepage preview of fan passport city stamps — real stamps only. */
export function PassportStampPreview({ stamps }: { stamps: string[] }) {
  const empty = stamps.length === 0;

  return (
    <div className="glass-panel rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5 p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <Stamp className="size-5 text-primary" />
        <p className="text-sm font-medium uppercase tracking-wide text-primary">Your digital passport</p>
      </div>
      {empty ? (
        <>
          <p className="mt-3 max-w-md text-sm font-medium">{HOMEPAGE_EMPTY_STATES.passport.title}</p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">{HOMEPAGE_EMPTY_STATES.passport.body}</p>
        </>
      ) : (
        <>
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
          </ul>
        </>
      )}
      <Button className="mt-6" href={empty ? ROUTES.passport : ROUTES.passport}>
        {empty ? HOMEPAGE_EMPTY_STATES.passport.ctaLabel : "Start collecting stamps"}
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
