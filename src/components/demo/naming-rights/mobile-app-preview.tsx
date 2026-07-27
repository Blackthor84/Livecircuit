import { MapPin, Radio } from "lucide-react";
import { SponsorBrandLogo } from "@/components/demo/naming-rights/sponsor-brand-logo";
import type { BrandTheme } from "@/lib/demo/naming-rights-utils";

export function MobileAppPreview({
  arenaName,
  companyName,
  theme,
}: {
  arenaName: string;
  companyName: string;
  theme: BrandTheme;
}) {
  return (
    <div className="mx-auto w-[280px]">
      <div className="rounded-[2.5rem] border-4 border-neutral-800 bg-neutral-950 p-3 shadow-2xl">
        <div className="overflow-hidden rounded-[2rem] bg-background">
          {/* Status bar */}
          <div className="flex items-center justify-between px-5 py-2 text-[10px] text-muted-foreground">
            <span>9:41</span>
            <span>LTE ▮▮▮</span>
          </div>

          {/* Sponsor banner */}
          <div className="px-3 py-2" style={{ background: theme.gradient }}>
            <p className="text-center text-[9px] font-medium uppercase tracking-wider text-white/80">
              Presented by {companyName}
            </p>
          </div>

          {/* Arena header */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <SponsorBrandLogo theme={theme} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{arenaName}</p>
                <p className="flex items-center gap-1 text-[10px] text-red-400">
                  <Radio className="size-2.5" /> 12.8K live
                </p>
              </div>
            </div>
          </div>

          {/* In-app sponsor banner */}
          <div
            className="mx-3 rounded-lg border px-3 py-2 text-center"
            style={{ borderColor: `${theme.gold}60`, background: "oklch(0.12 0.02 280)" }}
          >
            <p className="text-[9px] uppercase tracking-wider" style={{ color: theme.gold }}>
              Event Listing
            </p>
            <p className="mt-0.5 text-[11px] font-semibold">Presented by {companyName}</p>
          </div>

          {/* Event list */}
          <div className="space-y-2 px-3 py-3">
            {["Comedy Night", "Battle of the Bands"].map((event) => (
              <div key={event} className="glass-panel rounded-lg px-3 py-2">
                <p className="text-xs font-medium">{event}</p>
                <p className="text-[9px] text-muted-foreground">Presented by {companyName}</p>
              </div>
            ))}
          </div>

          {/* Map */}
          <div className="mx-3 mb-3 rounded-lg border border-white/10 bg-card/60 p-3">
            <p className="mb-2 flex items-center gap-1 text-[10px] font-medium">
              <MapPin className="size-3 text-primary" /> Arena Map
            </p>
            <div className="grid grid-cols-3 gap-1">
              {["Stage", "VIP", "Food"].map((zone) => (
                <div
                  key={zone}
                  className="rounded px-1 py-1.5 text-center text-[8px]"
                  style={{ background: `${theme.primary}25` }}
                >
                  {zone}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
