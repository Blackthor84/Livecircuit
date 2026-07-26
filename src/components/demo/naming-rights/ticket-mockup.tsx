"use client";

import QRCode from "react-qr-code";
import { SponsorBrandLogo } from "@/components/demo/naming-rights/sponsor-brand-logo";
import type { BrandTheme } from "@/lib/demo/naming-rights-utils";
import { cn } from "@/lib/utils";

export function TicketMockup({
  arenaName,
  companyName,
  theme,
  compact = false,
}: {
  arenaName: string;
  companyName?: string;
  theme: BrandTheme;
  compact?: boolean;
}) {
  return (
    <div className={cn("glass-panel overflow-hidden rounded-2xl border-amber-500/20", !compact && "mx-auto max-w-xs")}>
      <div className="h-2" style={{ background: theme.gradient }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400/90">
              LiveCircuit
            </p>
            <h4 className="mt-1 text-sm font-bold leading-snug">{arenaName}</h4>
          </div>
          <SponsorBrandLogo theme={theme} size="sm" />
        </div>
        <div className="my-4 border-t border-dashed border-white/15" />
        <p className="text-center text-lg font-semibold tracking-wide">Admits One</p>
        <p className="mt-1 text-center text-xs text-muted-foreground">General Admission · Digital Ticket</p>
        {companyName ? (
          <p className="mt-2 text-center text-[10px] font-medium" style={{ color: theme.gold }}>
            Presented by {companyName}
          </p>
        ) : null}
        <div className="mt-4 flex justify-center rounded-xl bg-white p-3">
          <QRCode value={`https://livecircuit.com/demo/${arenaName}`} size={80} />
        </div>
        <p className="mt-3 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
          Scan at venue entrance
        </p>
      </div>
    </div>
  );
}
