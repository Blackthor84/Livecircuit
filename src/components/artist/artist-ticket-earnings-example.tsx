"use client";

import { useMemo, useState } from "react";
import {
  calculateTicketEarningsExample,
  formatUsdFromCents,
  type ArtistEarningsDisplayConfig,
} from "@/lib/monetization/artist-earnings-display";

type Props = {
  config: ArtistEarningsDisplayConfig;
  defaultTicketPriceCents?: number;
};

export function ArtistTicketEarningsExample({
  config,
  defaultTicketPriceCents = 2000,
}: Props) {
  const [ticketPriceCents, setTicketPriceCents] = useState(defaultTicketPriceCents);

  const split = useMemo(
    () => calculateTicketEarningsExample(ticketPriceCents, config.platformFeePercent),
    [ticketPriceCents, config.platformFeePercent],
  );

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">
          Ticket price: <span className="text-primary">{formatUsdFromCents(ticketPriceCents)}</span>
        </legend>
        <input
          type="range"
          min={500}
          max={20000}
          step={100}
          value={ticketPriceCents}
          onChange={(e) => setTicketPriceCents(Number(e.target.value))}
          className="w-full accent-primary"
          aria-label="Ticket price"
        />
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>$5.00</span>
          <span>$200.00</span>
        </div>
      </fieldset>

      <dl className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-5">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-sm text-muted-foreground">Fan pays</dt>
          <dd className="font-semibold tabular-nums">{formatUsdFromCents(split.grossCents)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-sm text-muted-foreground">
            LiveCircuit {config.platformFeeLabel.toLowerCase()}
          </dt>
          <dd className="font-semibold tabular-nums text-rose-500">
            −{formatUsdFromCents(split.platformFeeCents)}{" "}
            <span className="text-xs text-muted-foreground">({split.platformFeePercent}%)</span>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-3">
          <dt className="text-sm font-medium">Artist earnings</dt>
          <dd className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatUsdFromCents(split.artistEarningsCents)}
          </dd>
        </div>
      </dl>

      <p className="text-xs text-muted-foreground">
        Informational example only. Actual checkout uses the platform fee locked at purchase time.
      </p>
    </div>
  );
}
